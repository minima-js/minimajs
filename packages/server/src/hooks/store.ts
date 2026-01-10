import { type HookStore, type GenericHookCallback } from "../interfaces/hooks.js";
import type { App } from "../interfaces/app.js";
import { kHooks } from "../symbols.js";
import type { Context, OnErrorHook, OnRequestHook, OnSendHook, OnTransformHook } from "../interfaces/index.js";
import type { ResponseBody } from "../interfaces/response.js";

/**
 * Hook Execution Order and Direction
 *
 * Hook         Direction           Order
 * ────────────────────────────────────────────
 * register     [Parent → Child]    FIFO (normal)
 * listen       [Parent → Child]    FIFO (normal)
 * ready        [Parent → Child]    FIFO (normal)
 * close        [Child → Parent]    LIFO (reversed)
 * request      [Parent → Child]    FIFO (normal)
 * transform    [Parent → Child]    FIFO (normal)
 * send         [Child → Parent]    LIFO (reversed)
 * sent         [Child → Parent]    LIFO (reversed)
 * error        [Child → Parent]    LIFO (reversed)
 * errorSent    [Child → Parent]    LIFO (reversed)
 * timeout      [Child → Parent]    LIFO (reversed)
 */

/**
 * @internal
 */
export const SERVER_HOOKS = ["close", "listen", "ready", "register"] as const;

/**
 * @internal
 */
export const LIFECYCLE_HOOKS = ["request", "transform", "send", "error", "errorSent", "sent", "timeout"] as const;

export type LifecycleHook = (typeof SERVER_HOOKS)[number] | (typeof LIFECYCLE_HOOKS)[number];

const reversedHooks = new Set<LifecycleHook>(["close", "send", "sent", "error", "errorSent", "timeout"]);

// ============================================================================
// HookStore Management
// ============================================================================

/**
 * Creates a new HookStore, optionally cloning from an existing store
 */
export function createHooksStore(): HookStore {
  const store = {} as HookStore;

  for (const hook of SERVER_HOOKS) {
    store[hook] = new Set();
  }

  for (const hook of LIFECYCLE_HOOKS) {
    store[hook] = new Set();
  }

  // Add clone method to make the store clonable
  store.clone = function (): HookStore {
    const clonedStore = {} as HookStore;

    // SERVER_HOOKS are NOT cloned - they're shared globally across all scopes
    // This is intentional: there's only ONE server instance, so hooks like
    // close, listen, ready, register should be shared. Later registered hooks
    for (const hook of SERVER_HOOKS) {
      clonedStore[hook] = this[hook];
    }

    // LIFECYCLE_HOOKS are cloned for proper encapsulation
    // Each child scope gets its own copy for request/response lifecycle hooks
    for (const hook of LIFECYCLE_HOOKS) {
      clonedStore[hook] = new Set(this[hook]);
    }

    return clonedStore;
  };

  return store;
}

/**
 * Gets the HookStore from the app's container
 */
export function getHooks<S = unknown>(app: App<S>): HookStore {
  const hooks = app.container.get(kHooks) as HookStore;
  if (!hooks) {
    throw new Error("HookStore not found in container");
  }
  return hooks;
}

/**
 * Adds a hook to the app
 */
export function addHook<S = unknown>(app: App<S>, name: LifecycleHook, callback: GenericHookCallback): void {
  const hooks = getHooks(app);
  hooks[name].add(callback);
}

// ============================================================================
// Run Hooks
// ============================================================================

function findHookToRun<T = GenericHookCallback, S = unknown>(app: App<S>, name: LifecycleHook): T[] {
  const store = app.container.get(kHooks) as HookStore;
  const hooks = [...store[name]] as T[];
  if (reversedHooks.has(name)) {
    return hooks.reverse();
  }
  return hooks;
}

/**
 * Runs all hooks for a given lifecycle event with automatic order detection
 * - Parent → Child hooks run in FIFO order (normal)
 * - Child → Parent hooks run in LIFO order (reversed)
 */
export async function runHooks<S = unknown>(app: App<S>, name: LifecycleHook, ...args: any[]): Promise<void> {
  const hooks = findHookToRun(app, name);
  for (const hook of hooks) {
    await hook(...args);
  }
}

export namespace runHooks {
  export async function safe<S = unknown>(app: App<S>, name: LifecycleHook, ...args: any[]): Promise<void> {
    const hooks = findHookToRun(app, name);
    for (const hook of hooks) {
      try {
        await hook(...args);
      } catch (e) {
        app.log.child({ hook: name, handler: hook.name || undefined }).error(e);
      }
    }
  }

  export async function request<S = unknown>(app: App<S>, ctx: Context<S>): Promise<void | Response> {
    const hooks = findHookToRun<OnRequestHook<S>, S>(app, "request");
    for (const hook of hooks) {
      const response = await hook(ctx);
      if (response instanceof Response) {
        return response;
      }
    }
  }

  export async function send<S = unknown>(app: App<S>, serialized: ResponseBody, ctx: Context<S>): Promise<void | Response> {
    const hooks = findHookToRun<OnSendHook<S>, S>(app, "send");
    for (const hook of hooks) {
      const response = await hook(serialized, ctx);
      if (response instanceof Response) {
        return response;
      }
    }
  }

  export async function transform<S = unknown>(app: App<S>, data: unknown, ctx: Context<S>) {
    const hooks = findHookToRun<OnTransformHook<S>, S>(app, "transform");
    let result = data;
    for (const hook of hooks) {
      result = await hook(result, ctx);
    }
    return result;
  }

  export async function error<S = unknown>(app: App<S>, error: unknown, ctx: Context<S>): Promise<any> {
    const hooks = findHookToRun<OnErrorHook<S>, S>(app, "error");
    let err = error;
    for (const hook of hooks) {
      try {
        const response = await hook(err, ctx);
        if (typeof response === "undefined") {
          continue;
        }
        return response;
      } catch (e) {
        err = e;
      }
    }
    throw err;
  }
}
