import { StatusCodes } from "http-status-codes";
import type { App, Dict, Request, Response } from "./types.js";
import { kErrorDecorator } from "./internal/symbol.js";
import { isRequestAbortedError, skipDecorator } from "./internal/response.js";

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

export interface HttpErrorOptions extends ErrorOptions {
  message?: string;
  code?: string;
  name?: string;
  base?: unknown;
}

export class HttpError extends BaseHttpError {
  public static toJSON = function toJSON<T extends HttpError = HttpError>(err: T): unknown {
    return typeof err.response === "string" ? { message: err.response } : err.response;
  };

  public static create(err: unknown, statusCode = 500) {
    if (err instanceof Error) {
      return new HttpError("Unable to process request", statusCode, {
        message: err.message,
        name: err.name,
        base: err,
      });
    }
    return new HttpError("Unable to process request", statusCode, {
      base: err,
    });
  }
  public statusCode: number;
  public base?: unknown;
  declare ["constructor"]: typeof HttpError;
  constructor(public response: ErrorResponse, statusCode: StatusCode, options?: HttpErrorOptions) {
    super(typeof response === "string" ? response : "Unknown error");
    Object.assign(this, options);
    if (typeof statusCode !== "number") {
      this.statusCode = StatusCodes[statusCode];
    } else {
      this.statusCode = statusCode;
    }
  }

  public toJSON(): unknown {
    return this.constructor.toJSON(this);
  }

  async render(req: Request, res: Response) {
    const decorator = getDecorator(req.server);
    const [status, payload] = await decorator(this);
    res.status(status).send(payload);
  }
}

export class NotFoundError extends HttpError {
  constructor(response: ErrorResponse = "") {
    super(response, 404);
    this.message = "Page not found";
  }

  render(req: Request, res: Response): Promise<void> {
    this.response ||= `Route ${req.method}:${req.url} not found`;
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

export class ValidationError extends HttpError {
  public static getStatusCode = function getStatusCode<T extends ValidationError>(_error: T) {
    return 422;
  };

  declare ["constructor"]: typeof ValidationError;
  constructor(response: ErrorResponse) {
    super(response, 400);
    this.statusCode = this.constructor.getStatusCode(this);
  }
}

export class ForbiddenError extends HttpError {
  constructor(response: ErrorResponse = "Forbidden") {
    super(response, 403);
  }
}

export function decorateError(app: App, render: ErrorDecorator) {
  app.decorate(kErrorDecorator, render);
}

export function errorHandler(error: unknown, req: Request, reply: Response) {
  if (isRequestAbortedError(error)) {
    return;
  }
  skipDecorator(reply);
  const handler = BaseHttpError.is(error) ? error : (req.server.log.error(error), HttpError.create(error));
  handler.render(req, reply);
}
