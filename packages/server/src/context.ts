import { getContext, getContextOrNull } from "./internal/context.js";
import { isCallable } from "./utils/callable.js";
export { safe } from "./internal/context.js";
export { getContext, getContextOrNull };

/**
 *
 * When a user cancels a request (e.g., closes a browser tab or navigates away from a page while a request is ongoing),
 * an `AbortSignal` event is triggered.
 * Can be attached to any async operation to prevent wasted resources on the server if a request is cancelled mid-flight.
 * @example
 * ```ts
 * import { getSignal } from '@minimajs/server/context';
 * fetch('https://api.github.com/users', { signal: getSignal() })
 * ```
 * if the user cancels the request, requesting to github users will be cancelled as well.
 * @since v0.1.0
 */
export function getSignal(): AbortSignal {
  return getContext().abortController.signal;
}

/**
 * Context enables sharing data within the request scope without the need to explicitly pass it around.
 * @example ```ts
 * import { createContext } from "@minimajs/server";
  export interface User {
    name: string;
  }
  export const [getUser, setUser] = createContext<User>({ name: "" }); // default name is empty string
 * ```
 * @since v0.1.0
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

export type OnceCallback<T> = () => T;
/**
 * called only once per request
 */
export function once<T>(callback: OnceCallback<T>): OnceCallback<T> {
  const empty = Symbol("empty");
  const [getValue, setValue] = createContext<T | typeof empty>(empty);
  return function handleRequest() {
    let value = getValue();
    if (value === empty) {
      value = callback();
      setValue(value);
    }
    return value;
  };
}

/**
 * memoize
 */
export function memo<T, A extends unknown[]>(callback: (...params: A) => T): (...params: A) => T {
  const [getStore] = createContext(new Map<string, T>());
  return function handleRequest(...params: A) {
    const key = JSON.stringify(params);
    const cached = getStore();
    if (cached.has(key)) {
      return cached.get(key)!;
    }
    const value = callback(...params);
    cached.set(key, value);
    return value;
  };
}
