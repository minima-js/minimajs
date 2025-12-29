import { LIFECYCLE_HOOKS, type HookStore, type LifecycleHook, type GenericHookCallback } from "../interfaces/hooks.js";
import type { App } from "../interfaces/app.js";
import { kHooks } from "../symbols.js";

// ============================================================================
// HookStore Management
// ============================================================================

/**
 * Creates a new HookStore, optionally cloning from an existing store
 */
export function createHooksStore(source?: HookStore): HookStore {
  const store = {} as HookStore;

  if (!source) {
    for (const hook of LIFECYCLE_HOOKS) {
      store[hook] = new Set();
    }
  } else {
    for (const hook of LIFECYCLE_HOOKS) {
      store[hook] = new Set(source[hook]);
    }
  }

  // Add clone method to make the store clonable
  store.clone = function (): HookStore {
    return createHooksStore(this);
  };

  return store;
}

/**
 * Gets the HookStore from the app's container
 */
export function getHooks(app: App): HookStore {
  const hooks = app.container.get(kHooks) as HookStore;
  if (!hooks) {
    throw new Error("HookStore not found in container");
  }
  return hooks;
}

/**
 * Adds a hook to the app
 */
export function addHook(app: App, name: LifecycleHook, callback: GenericHookCallback): void {
  const hooks = getHooks(app);
  hooks[name].add(callback);
}

// ============================================================================
// Run Hooks
// ============================================================================

/**
 * Runs all hooks for a given lifecycle event
 */
export async function runHooks(app: App, name: LifecycleHook, ...args: any[]): Promise<any> {
  const store = app.container.get(kHooks) as HookStore;
  const hooks = store[name];
  let result: any;
  for (const hook of hooks) {
    const hookResult = await hook(...args);
    if (hookResult !== undefined) {
      result = hookResult;
    }
  }
  return result;
}

export namespace runHooks {
  export function transform(app: App, data: unknown, req: Request) {
    const store = app.container.get(kHooks) as HookStore;
    const hook = store["transform"];
    if (hook.size === 0) {
      return data;
    }
    return runHooks(app, "transform", data, req);
  }

  export async function error(app: App, error: unknown, req: Request): Promise<any> {
    const store = app.container.get(kHooks) as HookStore;
    const hooks = store["error"];
    let result: any;
    let err = error;
    for (const hook of hooks) {
      try {
        result = await hook(err, req);
      } catch (e) {
        err = e;
        result = undefined;
      }
    }
    return result;
  }
}
