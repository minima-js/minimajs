import { isCallable } from "./utils/callable.js";
import assert from "node:assert";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Context } from "./index.js";

export type OnceCallback<T> = () => T;

/**
 * Creates a context for sharing data within a request's scope.
 *
 * It enables sharing data within the request scope without the need to explicitly pass it around.
 *
 * @example
 * ```ts
 * import { createContext } from "@minimajs/server";
 *
 * export interface User {
 *   name: string;
 * }
 *
 * // default name is empty string
 * export const [getUser, setUser] = createContext<User>({ name: "" });
 * ```
 *
 * @param value The default value for the context.
 * @returns A tuple containing a getter and a setter for the context value.
 *
 * @since v0.1.0
 */
export function createContext<T>(value?: T | (() => T)) {
  const kName = Symbol();

  function getValue() {
    const { locals } = context();
    if (!(kName in locals) && value !== undefined) {
      locals[kName] = isCallable(value) ? value() : value;
    }
    return locals[kName] as T;
  }

  function setValue(val: T) {
    const { locals } = context();
    locals[kName] = val;
  }

  return [getValue, setValue] as const;
}
export const executionContext = new AsyncLocalStorage<Context<any>>();

export function safe<T, U extends unknown[]>(cb: (...args: U) => T) {
  return (...args: U) => executionContext.run(null as any, cb, ...args) as T;
}

export function context<S>() {
  const context = executionContext.getStore();
  assert.ok(context, "context() was called outside of a request scope");
  return context as Context<S>;
}

export function maybeContext<S>() {
  return (executionContext.getStore() as Context<S>) || null;
}
