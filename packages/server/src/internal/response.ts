import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Next, Request, Response } from "../types.js";
import { isAsyncIterator } from "../utils/iterable.js";
import { createResponseDecoratorHandler, isResponseDecoratorSkipped } from "../utils/decorators/index.js";
export type { ResponseDecorator } from "../utils/decorators/index.js";

export const ResponseAbort = Symbol("RequestCancelled");

const [createResponseDecorator, getDecoratedResponse] = createResponseDecoratorHandler();
export { createResponseDecorator };

export function isRequestAbortedError(err: unknown) {
  if (err instanceof Error && err.cause === ResponseAbort) {
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

export function handleResponse(request: Request, response: Response, body: unknown, next: Next): void {
  if (isResponseDecoratorSkipped(response)) {
    next(null, body);
    return;
  }
  if (isAsyncIterator(body)) {
    response.hijack();
    pipeline(Readable.from(body), response.raw).catch((err) => {
      if (!request.raw.destroyed) {
        next(err);
      }
    });
    return;
  }

  getDecoratedResponse(request.server, request, body)
    .then((res) => {
      next(null, res);
    })
    .catch(next);
}
