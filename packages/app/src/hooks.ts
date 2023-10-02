import { createContext } from "./context.js";

type OnSentCallback = () => void | Promise<void>;
interface Hooks {
  onSent: OnSentCallback[];
}
const [getHooks] = createContext<Hooks>({ onSent: [] });

export function onSent(cb: OnSentCallback) {
  const hooks = getHooks();
  hooks.onSent.push(cb);
}

export async function triggerOnSent() {
  const hooks = getHooks();
  for (const hook of hooks.onSent) {
    await hook();
  }
}
