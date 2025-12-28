import { LIFECYCLE_HOOKS, type HookStore, type LifecycleHook } from "../interfaces/hooks.js";

/**
 * Creates a new HookStore, optionally cloning from an existing store
 * @param source - Optional source store to clone from
 * @returns A new HookStore with all lifecycle hooks initialized
 */
export function createHooksStore(source?: HookStore): HookStore {
  const store = {} as HookStore;

  if (!source) {
    for (const hook of LIFECYCLE_HOOKS) {
      store[hook] = new Set();
    }
    return store;
  }

  for (const hook of LIFECYCLE_HOOKS) {
    store[hook] = new Set(source[hook]);
  }
  return store;
}

export async function runHooks(store: HookStore, name: LifecycleHook, ...args: any[]): Promise<any> {
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
