import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { App, Next, Request, Response } from "../types.js";
import { isAsyncIterator } from "../utils/iterable.js";
import { kResponseDecorator } from "./symbol.js";
import { pipeline } from "node:stream/promises";

const SkipResponseDecorator = Symbol("response-no-decorate");
const ResponseAbort = Symbol("response");

function isDecoratorSkipped(response: Response) {
  return (response as any)[SkipResponseDecorator];
}

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
    console.log("error found, skipping");
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
console.log(new Error("a", { cause: "cause cool!!" }).cause);
