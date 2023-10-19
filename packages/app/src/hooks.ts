import { getHooks, type HookCallback } from "./fastify/hooks.js";
export type { HookCallback };
export function onSent(cb: HookCallback) {
  const hooks = getHooks();
  hooks.onSent.add(cb);
}
