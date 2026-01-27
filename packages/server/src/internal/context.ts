import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";
import type { Context } from "../interfaces/context.js";

export const executionContext = new AsyncLocalStorage<Context<any>>();

export function runInContext<S, T>(context: Context<S>, cb: () => T) {
  return executionContext.run(context, cb);
}

export function safe<T, U extends unknown[]>(cb: (...args: U) => T) {
  return (...args: U) => executionContext.run(null as any, cb, ...args) as T;
}

export function $context<S>() {
  const context = executionContext.getStore();
  assert.ok(context, "context() was called outside of a request scope");
  return context as Context<S>;
}

export function maybeContext<S>() {
  return (executionContext.getStore() as Context<S>) || null;
}
