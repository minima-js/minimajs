import { $context } from "./internal/context.js";
import { isCallable } from "./utils/callable.js";
export { safe } from "./internal/context.js";
export { maybeContext } from "./internal/context.js";
export type { Context } from "./internal/context.js";

export type OnceCallback<T> = () => T;

export function context() {
  return $context();
}

/**
 * Context utilities for managing request-scoped data and signals
 * @namespace
 */
export namespace context {
  /**
   * Context enables sharing data within the request scope without the need to explicitly pass it around.
   * @example
   * ```ts
   * import { context } from "@minimajs/server";
   * export interface User {
   *   name: string;
   * }
   * export const [getUser, setUser] = context.create<User>({ name: "" }); // default name is empty string
   * ```
   * @since v0.2.0
   */
  export function create<T>(value?: T | (() => T)) {
    const kName = Symbol();
    function getValue() {
      const { locals } = context();
      if (!locals.has(kName) && value !== undefined) {
        locals.set(kName, isCallable(value) ? value() : value);
      }
      return locals.get(kName) as T;
    }

    function setValue(val: T) {
      const { locals } = context();
      locals.set(kName, val);
    }
    return [getValue, setValue] as const;
  }
}

/**
 * Context enables sharing data within the request scope without the need to explicitly pass it around.
 * @example
 * ```ts
 * import { createContext } from "@minimajs/server";
 * export interface User {
 *   name: string;
 * }
 * export const [getUser, setUser] = createContext<User>({ name: "" }); // default name is empty string
 * ```
 * @see {@link context.create}
 * @since v0.1.0
 */
export const createContext = context.create;
