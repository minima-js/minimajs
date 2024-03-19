import { StatusCodes } from "http-status-codes";
import type { App, Dict, Request, Response } from "./types.js";
import { kErrorDecorator } from "./internal/symbol.js";

export type ErrorResponse = string | Dict;
export type StatusCode = keyof typeof StatusCodes | number;

function getDecorator(app: App): ErrorDecorator {
  return (
    app[kErrorDecorator] ??
    function render(err) {
      return [err.statusCode, err.toJSON()];
    }
  );
}

export type ErrorDecorator = (
  error: HttpError
) => [statusCode: number, payload: unknown] | Promise<[statusCode: number, payload: unknown]>;

export abstract class BaseHttpError extends Error {
  abstract statusCode: number;
  static is(value: unknown): value is BaseHttpError {
    return value instanceof this;
  }
  abstract render(req: Request, res: Response): void;
}

export interface HttpErrorOption {
  message?: string;
  cause?: string;
  code?: string;
  name?: string;
  base?: unknown;
}
export class HttpError extends BaseHttpError {
  public statusCode: number;
  public base?: unknown;

  public static toJSON = function toJSON(err: HttpError): unknown {
    return typeof err.response === "string" ? { message: err.message } : err.response;
  };

  constructor(public readonly response: ErrorResponse, statusCode: StatusCode, option: HttpErrorOption = {}) {
    super();
    Object.assign(this, option);
    if (typeof statusCode !== "number") {
      this.statusCode = StatusCodes[statusCode];
    } else {
      this.statusCode = statusCode;
    }
  }

  public toJSON(): unknown {
    return HttpError.toJSON(this);
  }

  async render(req: Request, res: Response) {
    res.hijack();
    const decorator = getDecorator(req.server);
    const [status, payload] = await decorator(this);
    const { raw: response } = res;
    response.statusCode = status;
    if (typeof payload === "string") {
      response.end(payload);
      return;
    }
    response.end(res.serialize(payload));
  }
}

export class NotFoundError extends HttpError {
  constructor(message = "") {
    super(message, 404);
  }

  render(req: Request, res: Response): Promise<void> {
    this.message ||= `Route ${req.method}:${req.url} not found`;
    return super.render(req, res);
  }
}

export class RedirectError extends BaseHttpError {
  public statusCode: number;
  constructor(public readonly url: string, isPermanent = false) {
    super();
    this.statusCode = isPermanent ? 301 : 302;
  }
  render(_: unknown, res: Response) {
    res.redirect(this.statusCode, this.url);
  }
}

export class ValidationError<T = unknown> extends HttpError {
  public static statusCode = 422;

  constructor(message: string, public readonly base?: T) {
    super(message, ValidationError.statusCode);
  }
}

export function decorateError(app: App, render: ErrorDecorator) {
  app.decorate(kErrorDecorator, render);
}

export function errorHandler(error: unknown, req: Request, reply: Response) {
  const handler = BaseHttpError.is(error)
    ? error
    : (req.server.log.error(error), new HttpError("Unable to process request", 500, { base: error }));
  handler.render(req, reply);
}
