import { type HookStore, type GenericHookCallback } from "../interfaces/hooks.js";
import type { App } from "../interfaces/app.js";
import { kHooks } from "../symbols.js";
import type { Context } from "../interfaces/index.js";

const SERVER_HOOKS = ["close", "listen", "ready", "register"] as const;
const LIFECYCLE_HOOKS = ["request", "transform", "send", "error", "errorSent", "sent", "timeout"] as const;

export type LifecycleHook = (typeof SERVER_HOOKS)[number] | (typeof LIFECYCLE_HOOKS)[number];

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
    const store = {} as HookStore;
    for (const hook of SERVER_HOOKS) {
      store[hook] = this[hook];
    }

    for (const hook of LIFECYCLE_HOOKS) {
      store[hook] = new Set(this[hook]);
    }
    return store;
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
  export function transform(app: App, data: unknown, ctx: Context) {
    const store = app.container.get(kHooks) as HookStore;
    const hook = store["transform"];
    if (hook.size === 0) {
      return data;
    }
    return runHooks(app, "transform", data, ctx);
  }

  export async function error(error: unknown, ctx: Context): Promise<any> {
    const store = ctx.app.container.get(kHooks) as HookStore;
    const hooks = store["error"];
    let result: any;
    let err = error;
    for (const hook of hooks) {
      try {
        result = await hook(err, ctx);
      } catch (e) {
        err = e;
        result = undefined;
      }
    }
    if (result === undefined) {
      throw err;
    }
    return result;
  }
}
