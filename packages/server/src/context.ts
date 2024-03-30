import { getContext, getContextOrNull } from "./internal/context.js";
import { isCallable } from "./utils/callable.js";
export { safeWrap } from "./internal/context.js";
export { getContext, getContextOrNull };

export function getSignal() {
  return getContext().abortController.signal;
}

export function createContext<T>(value?: T | (() => T)) {
  const kName = Symbol();
  function getValue() {
    const { local } = getContext();
    if (!local.has(kName) && value) {
      local.set(kName, isCallable(value) ? value() : value);
    }
    return local.get(kName) as T;
  }

  function setValue(val: T) {
    const { local } = getContext();
    local.set(kName, val);
  }

  return [getValue, setValue] as const;
}
