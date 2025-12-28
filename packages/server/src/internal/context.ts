import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";
import { type Container, type App } from "../interfaces/app.js";
import { type IncomingMessage, type ServerResponse } from "node:http";
import type { FindResult, HTTPVersion } from "find-my-way";

export type HookCallback = () => void | Promise<void>;
export type ErrorHookCallback = (err: unknown) => any | Promise<any>;

export interface ContextCallbacks {
  sent: Set<HookCallback>;
  error: Set<ErrorHookCallback>;
}

export interface Context {
  readonly app: App;
  readonly url: URL;
  readonly req: Request; // WebApi Request
  readonly container: Container; // app.container
  readonly locals: Map<symbol, unknown>;
  readonly signal: AbortSignal;
  readonly route: FindResult<HTTPVersion.V1> | null;
  readonly callbacks: ContextCallbacks;
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

export function context() {
  const context = contextStorage.getStore();
  assert.ok(context, "context() was called outside of a request scope");
  return context;
}

export function maybeContext() {
  return contextStorage.getStore() || null;
}

export function defaultCallbacks(): ContextCallbacks {
  return { sent: new Set(), error: new Set() };
}
