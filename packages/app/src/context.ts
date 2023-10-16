import { AsyncLocalStorage } from "node:async_hooks";
import type { Request, Response } from "./types.js";
import { isCallable } from "./utils/callable.js";
import assert from "node:assert";
interface Context {
  readonly req: Request;
  readonly reply: Response;
  readonly local: Map<string | symbol, unknown>;
}

const local = new AsyncLocalStorage<Context>();

export function wrap(req: Request, reply: Response, cb: () => unknown) {
  return local.run(Object.freeze({ req, reply, local: new Map() }), cb);
}

export function getContext() {
  const context = local.getStore();
  assert(context, "Maybe application is not wrapped with async storage");
  return context;
}

export function getContextOrNull() {
  const context = local.getStore();
  return context ?? null;
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
