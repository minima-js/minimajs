import { type HookStore, type GenericHookCallback } from "../interfaces/hooks.js";
import type { App } from "../interfaces/app.js";
import { kHooks } from "../symbols.js";
import type { Context, OnErrorHook, OnRequestHook, OnSendHook, OnTransformHook } from "../interfaces/index.js";
import type { ResponseBody } from "../interfaces/response.js";

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

function findHookToRun<T = GenericHookCallback>(app: App, name: LifecycleHook) {
  const store = app.container.get(kHooks) as HookStore;
  return [...store[name]].reverse() as T[];
}

/**
 * Runs all hooks for a given lifecycle event
 */
export async function runHooks(app: App, name: LifecycleHook, ...args: any[]): Promise<void> {
  const hooks = findHookToRun(app, name);
  for (const hook of hooks) {
    await hook(...args);
  }
}

export namespace runHooks {
  export async function request(app: App, ctx: Context): Promise<void | Response> {
    const hooks = findHookToRun<OnRequestHook>(app, "request");
    if (hooks.length === 0) {
      return;
    }

    for (const hook of hooks) {
      const response = hook(ctx);
      if (response instanceof Response) {
        return response;
      }
    }
  }

  export async function send(app: App, serialized: ResponseBody, ctx: Context): Promise<void | Response> {
    const hooks = findHookToRun<OnSendHook>(app, "send");
    if (hooks.length === 0) {
      return;
    }

    for (const hook of hooks) {
      const response = hook(serialized, ctx);
      if (response instanceof Response) {
        return response;
      }
    }
  }

  export async function transform(app: App, data: unknown, ctx: Context) {
    const hooks = findHookToRun<OnTransformHook>(app, "transform");
    if (hooks.length === 0) {
      return data;
    }
    let result = data;
    for (const hook of hooks) {
      result = await hook(result, ctx);
    }
    return result;
  }

  export async function error(app: App, error: unknown, ctx: Context): Promise<any> {
    const hooks = findHookToRun<OnErrorHook>(app, "error");
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
