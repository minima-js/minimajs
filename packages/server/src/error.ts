import { StatusCodes } from "http-status-codes";
import type { Dict, Request, Response } from "./types.js";
import { isRequestAbortedError } from "./internal/response.js";
import { createErrorDecoratorHandler } from "./utils/decorators/index.js";
import { skipResponseDecorator } from "./utils/decorators/index.js";

export type { ErrorDecorator } from "./utils/decorators/index.js";

/**
 * Represents the response body of an HTTP error.
 * Can be either a simple string message or a dictionary object with custom error data.
 */
export type ErrorResponse = string | Dict;

/**
 * Represents an HTTP status code.
 * Can be either a named status code from the StatusCodes enum or a numeric status code.
 */
export type StatusCode = keyof typeof StatusCodes | number;

export abstract class BaseHttpError extends Error {
  abstract statusCode: number;
  declare code?: string;
  static is(value: unknown): value is BaseHttpError {
    return value instanceof this;
  }
  abstract render(req: Request, res: Response): void | Promise<void>;
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
  static is(value: unknown): value is HttpError {
    return value instanceof this;
  }
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

  async render(_: Request, res: Response) {
    res.status(this.statusCode).send(this.toJSON());
  }
}

export class NotFoundError extends HttpError {
  constructor(response: ErrorResponse = "") {
    super(response, 404);
    this.message = "Page not found";
  }

  render(req: Request, res: Response): Promise<void> {
    this.response ||= `Route ${req.method} ${req.url} not found`;
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
    res.redirect(this.url, this.statusCode);
  }
}

export class ValidationError extends HttpError {
  public static getStatusCode = function getStatusCode<T extends ValidationError>(_error: T) {
    return 422;
  };

  declare ["constructor"]: typeof ValidationError;
  constructor(response: ErrorResponse = "Validation failed") {
    super(response, 400);
    this.statusCode ??= this.constructor.getStatusCode(this);
  }
}

export class ForbiddenError extends HttpError {
  constructor(response: ErrorResponse = "Forbidden") {
    super(response, 403);
  }
}

const [createErrorDecorator, getDecoratedError] = createErrorDecoratorHandler();

/**
 * Global error handler for HTTP requests.
 * Processes errors, applies error decorators, and renders appropriate error responses.
 * Handles request aborted errors silently and converts unknown errors to HTTP errors.
 */
export async function errorHandler(error: unknown, req: Request, reply: Response) {
  if (isRequestAbortedError(error)) {
    return;
  }
  skipResponseDecorator(reply); // tell response decorator not to re-decorate this response
  try {
    const response = await getDecoratedError(req.server, req, error);
    reply.send(response);
    reply.hijack(); // block further response
    return; // terminate here and send body!
  } catch (err) {
    error = err;
  }
  let handler: BaseHttpError;
  if (BaseHttpError.is(error)) {
    handler = error;
  } else {
    req.server.log.error(error);
    handler = HttpError.create(error);
  }
  await handler.render(req, reply);
  reply.hijack(); // block further response
}

export { createErrorDecorator };
