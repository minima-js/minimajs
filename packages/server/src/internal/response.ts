import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { Next, Request, Response } from "../types.js";
import { isAsyncIterator } from "../utils/iterable.js";
import { createDecoratorHandler } from "../utils/decorator.js";
export type ResponseDecorator = (body: unknown) => Promise<unknown> | unknown;

const SkipResponseDecorator = Symbol("response-no-decorate");
export const ResponseAbort = Symbol("RequestCancelled");

function isDecoratorSkipped(response: Response) {
  return (response as any)[SkipResponseDecorator];
}

const [createResponseDecorator, getDecoratedResponse] = createDecoratorHandler<ResponseDecorator>("response-decorator");
export { createResponseDecorator };

export function skipDecorator(response: Response) {
  (response as any)[SkipResponseDecorator] = true;
}

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

export function handleResponse(request: Request, res: Response, body: unknown, next: Next): void {
  if (isDecoratorSkipped(res)) {
    next(null, body);
    return;
  }
  if (isAsyncIterator(body)) {
    res.hijack();
    pipeline(Readable.from(body), res.raw).catch((err) => {
      if (!request.raw.destroyed) {
        next(err);
      }
    });
    return;
  }
  getDecoratedResponse(request.server, request, body)
    .then((res) => next(null, res))
    .catch(next);
}
