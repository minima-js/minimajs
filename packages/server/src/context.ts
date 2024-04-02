import { getContext, getContextOrNull } from "./internal/context.js";
import { isCallable } from "./utils/callable.js";
export { safeWrap } from "./internal/context.js";
export { getContext, getContextOrNull };

/**
 * When a user cancels a request (e.g., closes a browser tab or navigates away from a page while a request is ongoing), an AbortSignal event is triggered.
 * Can be attached to any async operation to prevent wasted resources on the server if a request is cancelled mid-flight.
 */
export function getSignal() {
  return getContext().abortController.signal;
}

/**
 * The concept of Context is fundamental to backend development, and it's a core feature of the minimajs framework. Context enables sharing data within the request scope without the need to explicitly pass it around.
 */
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
