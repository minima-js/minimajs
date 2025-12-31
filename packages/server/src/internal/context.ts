import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";
import type { Container, App } from "../interfaces/app.js";
import type { Route } from "../interfaces/route.js";
import { type IncomingMessage, type ServerResponse } from "node:http";
import type { ResponseState } from "../interfaces/response.js";

export type HookCallback = () => void | Promise<void>;
export type ErrorHookCallback = (err: unknown) => any | Promise<any>;

export interface Context {
  readonly app: App;
  readonly url: URL;
  readonly req: Request; // WebApi Request
  readonly resInit: ResponseState; // Mutable response headers/status
  readonly container: Container; // app.container
  readonly locals: Map<symbol, unknown>;
  readonly signal: AbortSignal;
  readonly route: Route | null;
  readonly rawReq?: IncomingMessage;
  readonly rawRes?: ServerResponse;
}

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
