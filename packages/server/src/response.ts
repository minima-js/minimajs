import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "./types.js";
import { isAsyncIterator } from "./utils/iterable.js";
import { Readable } from "node:stream";

export abstract class BaseHttpResponse {
  constructor() {}
  render(_: IncomingMessage, __: ServerResponse) {
    throw new Error("Must implement render method");
  }
}

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
  req: Request,
  res: Response,
  body: unknown,
  next: CallableFunction
) {
  if (isAsyncIterator(body)) {
    res.hijack();
    Readable.from(body).pipe(res.raw);
    return;
  }
  if (body instanceof BaseHttpResponse) {
    res.hijack();
    body.render(req.raw, res.raw);
    return;
  }
  next();
}
