import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "./types.js";
import { isAsyncIterator } from "./utils/iterable.js";
import { Readable } from "node:stream";

export abstract class BaseHttpResponse {
  constructor() {}
  render(req: IncomingMessage, res: ServerResponse) {
    throw new Error("Must implement render method");
  }
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
