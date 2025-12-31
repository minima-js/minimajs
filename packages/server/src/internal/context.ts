import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";
import type { Context } from "../interfaces/context.js";

export type HookCallback = () => void | Promise<void>;
export type ErrorHookCallback = (err: unknown) => any | Promise<any>;

const contextStorage = new AsyncLocalStorage<Context>();

export function wrap<T>(context: Context, cb: () => T) {
  return contextStorage.run(Object.freeze(context), cb);
}

export function safe<T, U extends unknown[]>(cb: (...args: U) => T) {
  return (...args: U) => contextStorage.run(null as any, cb, ...args) as T;
}

export function $context() {
  const context = contextStorage.getStore();
  assert.ok(context, "context() was called outside of a request scope");
  return context;
}

export function maybeContext() {
  return contextStorage.getStore() || null;
}
