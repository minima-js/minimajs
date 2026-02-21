/**
 * File locking mechanism for concurrent access control
 */

export interface LockOptions {
  /** Lock timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Retry interval in milliseconds (default: 100) */
  retryInterval?: number;
}

interface Lock {
  key: string;
  acquiredAt: number;
  timeout: number;
}

/**
 * In-memory file locking manager
 */
export class LockManager {
  private locks = new Map<string, Lock>();
  private waitQueues = new Map<string, Array<() => void>>();

  /**
   * Acquire a lock for a file key
   */
  async lock(key: string, options: LockOptions = {}): Promise<() => void> {
    const { timeout = 30000, retryInterval = 100 } = options;
    const startTime = Date.now();

    while (this.locks.has(key)) {
      // Check if existing lock has expired
      const existingLock = this.locks.get(key)!;
      if (Date.now() - existingLock.acquiredAt > existingLock.timeout) {
        // Lock expired, remove it
        this.locks.delete(key);
        break;
      }

      // Wait for lock to be released
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeout) {
        throw new Error(`Failed to acquire lock for "${key}" within ${timeout}ms`);
      }

      // Wait on queue
      await new Promise<void>((resolve) => {
        const queue = this.waitQueues.get(key) || [];
        queue.push(resolve);
        this.waitQueues.set(key, queue);

        // Also set a timeout to retry
        setTimeout(resolve, retryInterval);
      });
    }

    // Acquire the lock
    this.locks.set(key, {
      key,
      acquiredAt: Date.now(),
      timeout,
    });
    return () => this.unlock(key);
  }

  /**
   * Release a lock for a file key
   */
  unlock(key: string): void {
    this.locks.delete(key);

    // Notify waiters
    const queue = this.waitQueues.get(key);
    if (queue && queue.length > 0) {
      const waiter = queue.shift()!;
      waiter();

      if (queue.length === 0) {
        this.waitQueues.delete(key);
      }
    }
  }

  /**
   * Execute a function with a lock
   */
  async withLock<T>(key: string, fn: () => Promise<T>, options?: LockOptions): Promise<T> {
    const unlock = await this.lock(key, options);
    try {
      return await fn();
    } finally {
      unlock();
    }
  }

  /**
   * Check if a key is locked
   */
  isLocked(key: string): boolean {
    if (!this.locks.has(key)) {
      return false;
    }

    // Check if lock expired
    const lock = this.locks.get(key)!;
    if (Date.now() - lock.acquiredAt > lock.timeout) {
      this.locks.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all locks (for cleanup)
   */
  clear(): void {
    this.locks.clear();
    this.waitQueues.clear();
  }
}
