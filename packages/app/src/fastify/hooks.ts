import { createContext } from "../context.js";

export type HookCallback = () => void | Promise<void>;

interface Hooks {
  onSent: Set<HookCallback>;
}

export const [getHooks] = createContext<Hooks>(() => ({ onSent: new Set() }));

export async function triggerOnSent() {
  const hooks = getHooks();
  for (const hook of hooks.onSent) {
    await hook();
  }
}
