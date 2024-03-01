import type { IncomingMessage, ServerResponse } from "node:http";
import type { App, Request, Response } from "../types.js";
import { isAsyncIterator } from "../utils/iterable.js";
import { Readable } from "node:stream";
import { kResponseDecorator } from "./symbol.js";

export function createAbortController(
  message: IncomingMessage,
  response: ServerResponse
) {
  const controller = new AbortController();
  response.on("close", () => {
    if (message.destroyed) {
      controller.abort();
    }
  });
  return controller;
}

export function handleResponse(
  request: Request,
  res: Response,
  body: unknown,
  next: CallableFunction
) {
  if (isAsyncIterator(body)) {
    res.hijack();
    Readable.from(body).pipe(res.raw);
    return;
  }
  decorateResponse(request.server, body)
    .then((newBody) => {
      next(null, newBody);
    })
    .catch((err) => next(err));
}

async function decorateResponse(app: App, body: unknown) {
  const decorator = app[kResponseDecorator];
  if (!decorator) {
    return body;
  }
  return decorator(body);
}
