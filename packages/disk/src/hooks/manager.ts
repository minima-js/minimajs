import { HookTrigger } from "./trigger.js";
import type { DiskHooks } from "./types.js";

/**
 * Hook manager for disk operations
 */
export class HookManager {
  private readonly hooks: Record<string, Set<(...args: any[]) => any>> = {};

  public readonly trigger: HookTrigger;

  constructor(initialHooks?: Partial<DiskHooks>) {
    if (initialHooks) {
      for (const [event, handler] of Object.entries(initialHooks)) {
        if (handler) {
          this.add(event as keyof DiskHooks, handler as any);
        }
      }
    }
    this.trigger = new HookTrigger(this.hooks);
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
    handlers.delete(handler as any);
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
