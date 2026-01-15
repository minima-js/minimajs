import { type HookStore, type GenericHookCallback } from "../interfaces/hooks.js";
import type { App } from "../interfaces/app.js";
import { kHooks } from "../symbols.js";
import type { Context, OnErrorHook, OnRequestHook, OnSendHook, OnTransformHook } from "../interfaces/index.js";

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
 * transform    [Child → Parent]    LIFO (reversed)
 * send         [Child → Parent]    LIFO (reversed)
 * error        [Child → Parent]    LIFO (reversed)
 * timeout      [Child → Parent]    LIFO (reversed)
 */

/**
 * @internal
 */
export const SERVER_HOOKS = ["close", "listen", "ready", "register"] as const;

/**
 * @internal
 */
export const LIFECYCLE_HOOKS = ["request", "transform", "send", "error", "timeout"] as const;

export type LifecycleHook = (typeof SERVER_HOOKS)[number] | (typeof LIFECYCLE_HOOKS)[number];

const reversedHooks = new Set<LifecycleHook>(["close", "transform", "send", "error", "timeout"]);

// ============================================================================
// HookStore Management
// ============================================================================

/**
 * Creates a new HookStore with proper cloning support for module isolation
 */
export function createHooksStore(parent?: HookStore): HookStore {
  const store = {
    clone() {
      return createHooksStore(this);
    },
  } as HookStore;

  if (!parent) {
    // Parent not provided, initialize new store
    for (const hook of SERVER_HOOKS) {
      store[hook] = new Set();
    }
    for (const hook of LIFECYCLE_HOOKS) {
      store[hook] = new Set();
    }
    return store;
  }

  for (const hook of SERVER_HOOKS) {
    // Share reference for server hooks (global server lifecycle)
    store[hook] = parent[hook];
  }
  for (const hook of LIFECYCLE_HOOKS) {
    // Always copy for lifecycle hooks (module isolation)
    store[hook] = new Set(parent[hook]);
  }
  return store;
}

// ============================================================================
// Run Hooks
// ============================================================================

/**
 * Retrieves hooks for a lifecycle event from the app's store
 * @returns Hooks in correct execution order (FIFO or LIFO based on hook type)
 */
function findHookToRun<T = GenericHookCallback, S = unknown>(app: App<S>, name: LifecycleHook): Iterable<T> {
  const store = app.container[kHooks];
  const hooks = store[name] as Set<T>;

  // LIFO hooks (Child → Parent) need reversed execution order
  return reversedHooks.has(name) ? [...hooks].reverse() : hooks;
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

  export async function send<S = unknown>(app: App<S>, response: Response, ctx: Context<S>): Promise<void | Response> {
    const hooks = findHookToRun<OnSendHook<S>, S>(app, "send");
    for (const hook of hooks) {
      await hook(response, ctx);
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
