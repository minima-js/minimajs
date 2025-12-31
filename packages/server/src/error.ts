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

import type { Dict, HeadersInit } from "./interfaces/response.js";
import { toStatusCode, type StatusCode, createResponseFromState } from "./internal/response.js";
import type { Context } from "./interfaces/context.js";

/**
 * Represents the response body of an HTTP error.
 * Can be either a simple string message or a dictionary object with custom error data.
 */
export type ErrorResponse = string | Dict;

export abstract class BaseHttpError extends Error {
  abstract statusCode: number;
  declare code?: string;
  static is(value: unknown): value is BaseHttpError {
    return value instanceof this;
  }
  abstract render(ctx: Context): Response | Promise<Response>;
}

export interface HttpErrorOptions extends ErrorOptions {
  message?: string;
  code?: string;
  name?: string;
  base?: unknown;
  headers?: HeadersInit;
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
  public headers?: HeadersInit;
  declare ["constructor"]: typeof HttpError;
  constructor(public response: ErrorResponse, statusCode: StatusCode, options?: HttpErrorOptions) {
    super(typeof response === "string" ? response : "Unknown error");
    Object.assign(this, options);
    this.statusCode = toStatusCode(statusCode);
  }

  public toJSON(): unknown {
    return this.constructor.toJSON(this);
  }

  async render(ctx: Context): Promise<Response> {
    return createResponseFromState(await ctx.app.serialize(this.toJSON(), ctx), {
      status: this.statusCode,
      headers: this.headers,
    });
  }
}

export class NotFoundError extends HttpError {
  constructor(response: ErrorResponse = "", options?: HttpErrorOptions) {
    super(response, 404, options);
    this.message = "Page not found";
  }

  async render(ctx: Context): Promise<Response> {
    this.response ||= `Route ${ctx.request.method} ${ctx.url.pathname} not found`;
    return super.render(ctx);
  }
}

export class RedirectError extends BaseHttpError {
  public statusCode: number;
  public headers?: HeadersInit;
  constructor(public readonly url: string, isPermanent = false, options?: HttpErrorOptions) {
    super();
    this.statusCode = isPermanent ? 301 : 302;
    Object.assign(this, options);
  }
  render(_ctx: Context): Response {
    // Merge instance headers with Location header
    const headers = new Headers(this.headers);
    headers.set("Location", this.url);

    return createResponseFromState(null, {
      status: this.statusCode,
      headers,
    });
  }
}

export class ValidationError extends HttpError {
  public static getStatusCode = function getStatusCode<T extends ValidationError>(_error: T) {
    return 422;
  };

  constructor(response: ErrorResponse = "Validation failed", options?: HttpErrorOptions) {
    super(response, 400, options);
    this.statusCode ??= (this.constructor as typeof ValidationError).getStatusCode(this);
  }
}

export class ForbiddenError extends HttpError {
  constructor(response: ErrorResponse = "Forbidden", options?: HttpErrorOptions) {
    super(response, 403, options);
  }
}
