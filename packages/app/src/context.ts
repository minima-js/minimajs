import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response } from "./types.js";
import { isCallable } from "./utils/callable.js";
import assert from "node:assert";
import { createAbortController } from "./response.js";

export type HookCallback = () => void | Promise<void>;

export interface Hooks {
  onSent: Set<HookCallback>;
}

interface Context {
  readonly req: Request;
  readonly reply: Response;
  readonly local: Map<string | symbol, unknown>;
  readonly abortController: AbortController;
  readonly hooks: Hooks;
}

const local = new AsyncLocalStorage<Context>();

function createHooks(): Hooks {
  return { onSent: new Set() };
}

export function wrap(req: Request, reply: Response, cb: () => unknown) {
  return local.run(
    Object.freeze({
      req,
      reply,
      local: new Map(),
      abortController: createAbortController(req.raw, reply.raw),
      hooks: createHooks(),
    }),
    cb
  );
}

export function getContext() {
  const context = local.getStore();
  assert(context, "Unable to access the context beyond the request scope.");
  return context;
}

export function getSignal() {
  return getContext().abortController.signal;
}

export function getContextOrNull() {
  return local.getStore() || null;
}

export function getHooks() {
  return getContext().hooks;
}

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
