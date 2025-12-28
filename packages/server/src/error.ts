/**
 * Error handling utilities
 *
 * Provides error handling classes and utilities for HTTP error responses.
 * Includes base error classes, error decorators, and utilities for working with HTTP status codes.
 *
 * @module @minimajs/server/error
 *
 * @example
 * ```typescript
 * import { HttpError, NotFoundError } from '@minimajs/server/error';
 *
 * throw new NotFoundError('Resource not found');
 * throw new HttpError('Custom error', 400);
 * ```
 */

import { StatusCodes } from "http-status-codes";
import type { App, Dict } from "./types.js";
export type { ErrorDecorator, DecoratorOptions } from "./utils/decorators/index.js";

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
  abstract render(app: App, req: Request): Promise<Response>;
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

  async render(app: App, req: Request): Promise<Response> {
    return new Response(await app.serialize(this.toJSON(), req), {
      status: this.statusCode,
    });
  }
}

export class NotFoundError extends HttpError {
  constructor(response: ErrorResponse = "", public pathname: string) {
    super(response, 404);
    this.message = "Page not found";
  }

  async render(app: App, req: Request): Promise<Response> {
    this.response ||= `Route ${req.method} ${req.url} not found`;
    return super.render(app, req);
  }
}

export class RedirectError extends BaseHttpError {
  public statusCode: number;
  constructor(public readonly url: string, isPermanent = false) {
    super();
    this.statusCode = isPermanent ? 301 : 302;
  }
  async render(app: App, req: Request): Promise<Response> {
    return new Response(undefined, {
      status: this.statusCode,
      headers: {
        Location: this.url,
      },
    });
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
