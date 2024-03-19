import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { App, Next, Request, Response } from "../types.js";
import { isAsyncIterator, isObject } from "../utils/iterable.js";
import { kResponseDecorator } from "./symbol.js";
import { pipeline } from "node:stream/promises";

const ResponseAbort = Symbol("response");
export function isRequestAbortedError(err: unknown) {
  if (isObject(err) && err.cause === ResponseAbort) {
    return true;
  }
  return false;
}

export function createAbortController(message: IncomingMessage, response: ServerResponse) {
  const controller = new AbortController();
  response.on("close", () => {
    if (message.destroyed) {
      controller.abort(ResponseAbort);
    }
  });
  return controller;
}

export function handleResponse(request: Request, res: Response, body: unknown, next: Next): void {
  if (isAsyncIterator(body)) {
    res.hijack();
    pipeline(Readable.from(body), res.raw).catch((err) => {
      if (!request.raw.destroyed) {
        next(err);
      }
    });
    return;
  }
  decorateResponse(request.server, body)
    .then((res) => next(null, res))
    .catch(next);
}

async function decorateResponse(app: App, body: unknown) {
  const decorator = app[kResponseDecorator];
  if (!decorator) {
    return body;
  }
  return decorator(body);
}
