import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response } from "./types.js";
import { isCallable } from "./utils/callable.js";
import assert from "node:assert";
import { createAbortController } from "./response.js";
interface Context {
  readonly req: Request;
  readonly reply: Response;
  readonly local: Map<string | symbol, unknown>;
  readonly $abortController: AbortController;
}

const local = new AsyncLocalStorage<Context>();

export function wrap(req: Request, reply: Response, cb: () => unknown) {
  const $abortController = createAbortController(req.raw, reply.raw);
  return local.run(
    Object.freeze({ req, reply, local: new Map(), $abortController }),
    cb
  );
}

export function getContext() {
  const context = local.getStore();
  assert(context, "Unable to access the context beyond the request scope.");
  return context;
}

export function getSignal() {
  return getContext().$abortController.signal;
}

export function getContextOrNull() {
  return local.getStore() || null;
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
