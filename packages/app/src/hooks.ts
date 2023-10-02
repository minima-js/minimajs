import { createContext } from "./context.js";

type OnSentCallback = () => void | Promise<void>;
interface Hooks {
  onSent: Set<OnSentCallback>;
}
const [getHooks] = createContext<Hooks>({ onSent: new Set() });

export function onSent(cb: OnSentCallback) {
  const hooks = getHooks();
  hooks.onSent.add(cb);
}

export async function triggerOnSent() {
  const hooks = getHooks();
  for (const hook of hooks.onSent) {
    await hook();
  }
}
