import type { DiskFile } from "./file.js";
import type { FileMetadata, PutOptions, UrlOptions, ListOptions } from "./types.js";

/**
 * Hook context for 'put' operation
 */
export interface PutHookContext {
  path: string;
  options: PutOptions;
  /** Set to skip the actual put operation */
  skipOperation?: boolean;
  /** Replace the result with custom metadata */
  result?: FileMetadata;
}

/**
 * Hook context for 'get' operation
 */
export interface GetHookContext {
  path: string;
  /** Set to skip the actual get operation */
  skipOperation?: boolean;
  /** Replace the result with custom file */
  result?: DiskFile | null;
}

/**
 * Hook context for 'delete' operation
 */
export interface DeleteHookContext {
  path: string;
  /** Set to skip the actual delete operation */
  skipOperation?: boolean;
}

/**
 * Hook context for 'exists' operation
 */
export interface ExistsHookContext {
  path: string;
  /** Set to skip the actual exists check */
  skipOperation?: boolean;
  /** Replace the result */
  result?: boolean;
}

/**
 * Hook context for 'copy' operation
 */
export interface CopyHookContext {
  from: string;
  to: string;
  /** Set to skip the actual copy operation */
  skipOperation?: boolean;
  /** Replace the result with custom file */
  result?: DiskFile;
}

/**
 * Hook context for 'move' operation
 */
export interface MoveHookContext {
  from: string;
  to: string;
  /** Set to skip the actual move operation */
  skipOperation?: boolean;
  /** Replace the result with custom file */
  result?: DiskFile;
}

/**
 * Hook context for 'url' operation
 */
export interface UrlHookContext {
  path: string;
  options?: UrlOptions;
  /** Set to skip the actual url generation */
  skipOperation?: boolean;
  /** Replace the result with custom URL */
  result?: string;
}

/**
 * Hook context for 'list' operation
 */
export interface ListHookContext {
  prefix?: string;
  options?: ListOptions;
  /** Set to skip the actual list operation */
  skipOperation?: boolean;
}

/**
 * All available disk hooks
 */
export interface DiskHooks {
  /** Called before put operation */
  put?: (context: PutHookContext) => void | Promise<void>;
  /** Called after put operation */
  stored?: (file: DiskFile, context: PutHookContext) => void | Promise<void>;

  /** Called before get operation */
  get?: (context: GetHookContext) => void | Promise<void>;
  /** Called after get operation */
  retrieved?: (file: DiskFile | null, context: GetHookContext) => void | Promise<void>;

  /** Called before delete operation */
  delete?: (context: DeleteHookContext) => void | Promise<void>;
  /** Called after delete operation */
  deleted?: (context: DeleteHookContext) => void | Promise<void>;

  /** Called before exists check */
  exists?: (context: ExistsHookContext) => void | Promise<void>;
  /** Called after exists check */
  checked?: (exists: boolean, context: ExistsHookContext) => void | Promise<void>;

  /** Called before copy operation */
  copy?: (context: CopyHookContext) => void | Promise<void>;
  /** Called after copy operation */
  copied?: (file: DiskFile, context: CopyHookContext) => void | Promise<void>;

  /** Called before move operation */
  move?: (context: MoveHookContext) => void | Promise<void>;
  /** Called after move operation */
  moved?: (file: DiskFile, context: MoveHookContext) => void | Promise<void>;

  /** Called after url is generated */
  url?: (url: string, context: UrlHookContext) => void | Promise<void>;

  /** Called before list operation */
  list?: (context: ListHookContext) => void | Promise<void>;

  /** Called when a file stream is accessed (stream(), arrayBuffer(), text(), bytes()) */
  streaming?: (stream: ReadableStream, file: DiskFile) => void | Promise<void>;
}

/**
 * Hook manager for disk operations
 */
export class HookManager {
  private readonly hooks: Record<string, Set<(...args: any[]) => void | Promise<void>>> = {};

  /** Hooks that execute in LIFO order (after/completion hooks) */
  private readonly afterHooks = new Set<keyof DiskHooks>([
    "stored",
    "retrieved",
    "deleted",
    "checked",
    "copied",
    "moved",
    "url",
  ]);

  constructor(initialHooks?: Partial<DiskHooks>) {
    if (initialHooks) {
      for (const [event, handler] of Object.entries(initialHooks)) {
        if (handler) {
          this.add(event as keyof DiskHooks, handler as any);
        }
      }
    }
  }

  /**
   * Register a hook
   */
  add<K extends keyof DiskHooks>(event: K, handler: NonNullable<DiskHooks[K]>): void {
    if (!this.hooks[event]) {
      this.hooks[event] = new Set();
    }
    this.hooks[event].add(handler as any);
  }

  /**
   * Remove a hook
   */
  remove<K extends keyof DiskHooks>(event: K, handler: NonNullable<DiskHooks[K]>): void {
    const handlers = this.hooks[event];
    if (!handlers) return;
    handlers.delete(handler);
  }

  /**
   * Execute all hooks for an event
   * - FIFO order for "before" hooks (first registered first)
   * - LIFO order for "after" hooks (last registered first)
   */
  async trigger<K extends keyof DiskHooks>(event: K, ...args: Parameters<NonNullable<DiskHooks[K]>>): Promise<void> {
    const handlers = this.hooks[event];
    if (!handlers || handlers.size === 0) return;

    // Convert Set to array
    const handlerArray = Array.from(handlers);

    // Determine order based on hook type
    if (this.afterHooks.has(event)) {
      // LIFO order for after hooks (last registered first)
      for (let i = handlerArray.length - 1; i >= 0; i--) {
        const handler = handlerArray[i];
        if (handler) {
          await handler(...args);
        }
      }
    } else {
      // FIFO order for before hooks (first registered first)
      for (const handler of handlerArray) {
        if (handler) {
          await handler(...args);
        }
      }
    }
  }

  /**
   * Clear all hooks for an event
   */
  clear<K extends keyof DiskHooks>(event?: K): void {
    if (event) {
      delete this.hooks[event];
    } else {
      for (const key in this.hooks) {
        delete this.hooks[key];
      }
    }
  }

  /**
   * Get list of events that have registered hooks
   */
  getRegisteredEvents(): string[] {
    return Object.keys(this.hooks).filter((key) => {
      const handlers = this.hooks[key];
      return handlers && handlers.size > 0;
    });
  }
}
