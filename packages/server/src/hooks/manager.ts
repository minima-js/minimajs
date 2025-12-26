import type { HookCallback, HookStore, LifecycleHook } from "./types.js";

export function cloneHooksStore(store: HookStore) {
  const clone: HookStore = new Map();
  for (const [key, set] of store) {
    clone.set(key, new Set(set));
  }
  return clone;
}

export function add2hooks(store: HookStore, hook: LifecycleHook, callback: HookCallback) {
  let set = store.get(hook);
  if (!set) {
    set = new Set<HookCallback>();
    store.set(hook, set);
  }
  set.add(callback);
}

export async function runHooks(store: HookStore, name: LifecycleHook, ...args: any[]) {
  const hooks = store.get(name);
  if (!hooks) return;
  for (const hook of hooks) {
    await hook(...args);
  }
}
