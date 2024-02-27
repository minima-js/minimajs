import { getHooks, type HookCallback } from "./internal/context.js";

export function defer(cb: HookCallback) {
  const hooks = getHooks();
  hooks.onSent.add(cb);
}
