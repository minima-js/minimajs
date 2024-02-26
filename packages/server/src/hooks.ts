import { getHooks, type HookCallback } from "./internal/context.js";

export function onSent(cb: HookCallback) {
  const hooks = getHooks();
  hooks.onSent.add(cb);
}

export const defer = onSent;
