import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";
import type { Context } from "../interfaces/context.js";

export type HookCallback = () => void | Promise<void>;
export type ErrorHookCallback = (err: unknown) => any | Promise<any>;

const contextStorage = new AsyncLocalStorage<Context<any>>();

export function wrap<S, T>(context: Context<S>, cb: () => T) {
  return contextStorage.run(context, cb);
}

export function safe<T, U extends unknown[]>(cb: (...args: U) => T) {
  return (...args: U) => contextStorage.run(null as any, cb, ...args) as T;
}

export function $context<S>() {
  const context = contextStorage.getStore();
  assert.ok(context, "context() was called outside of a request scope");
  return context as Context<S>;
}

export function maybeContext<S>() {
  return (contextStorage.getStore() as Context<S>) || null;
}
