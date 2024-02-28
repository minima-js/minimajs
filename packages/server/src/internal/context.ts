import { AsyncLocalStorage } from "node:async_hooks";
import assert from "node:assert";
import { createAbortController } from "./response.js";
import type { Request, Response } from "../types.js";

export type HookCallback = () => void | Promise<void>;

export interface Hooks {
  onSent: Set<HookCallback>;
}

interface Context {
  readonly req: Request;
  readonly reply: Response;
  readonly local: Map<symbol, unknown>;
  readonly abortController: AbortController;
  readonly hooks: Hooks;
}
const local = new AsyncLocalStorage<Context>();

function createContextWrap(req: Request, reply: Response): Context {
  return {
    req,
    reply,
    local: new Map(),
    abortController: createAbortController(req.raw, reply.raw),
    hooks: { onSent: new Set() },
  };
}
export function wrap(req: Request, reply: Response, cb: () => unknown) {
  return local.run(Object.freeze(createContextWrap(req, reply)), cb);
}

export function getHooks() {
  return getContext().hooks;
}

export function getContext() {
  const context = local.getStore();
  assert(context, "Unable to access the context beyond the request scope.");
  return context;
}

export function getContextOrNull() {
  return local.getStore() || null;
}
