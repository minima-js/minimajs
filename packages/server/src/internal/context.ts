import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";
import { Container, type App } from "../interfaces/app.js";
import { type IncomingMessage, type ServerResponse } from "node:http";

export type HookCallback = () => void | Promise<void>;
export type ErrorHookCallback = (err: unknown) => any | Promise<any>;

export interface Hooks {
  onSent: Set<HookCallback>;
  onError: Set<ErrorHookCallback>;
}

export interface Context {
  readonly app: App;
  readonly req: Request; // WebApi Request
  readonly res: Response; // WebApi Response
  readonly container: Container; // app.container
  readonly locals: Map<symbol, unknown>;
  readonly abortController: AbortController;
  readonly hooks: Hooks;
  readonly rawReq?: IncomingMessage;
  readonly rawRes?: ServerResponse;
}

const contextStorage = new AsyncLocalStorage<Context>();

export function defaultHooks(): Hooks {
  return { onSent: new Set(), onError: new Set() };
}

export function wrap(context: Omit<Context, "hooks">, cb: () => unknown) {
  return contextStorage.run(Object.freeze({ ...context, hooks: defaultHooks() }), cb);
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
