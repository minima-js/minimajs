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
  assert(context, "Can't access the data outside of request");
  return context;
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
