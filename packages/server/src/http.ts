import type { ParsedUrlQuery } from "node:querystring";
import { StatusCodes } from "http-status-codes";
import { getContext, once } from "./context.js";
import {
  RedirectError,
  HttpError,
  BaseHttpError,
  ValidationError,
  NotFoundError,
  type ErrorResponse,
  type StatusCode,
} from "./error.js";
import type { Dict, HttpHeader, HttpHeaderIncoming, Request, Response } from "./types.js";

import { ResponseAbort } from "./internal/response.js";
import { toFirstValue } from "./utils/iterable.js";

function throwAttributeError(accessor: string, name: string, message: string): never {
  throw new ValidationError(accessor + "`" + name + "` " + message);
}

// ============================================================================
// Request / Response
// ============================================================================

/**
 * Retrieves the HTTP request object.
 * @example ```ts
 * const req = request();
 * console.log(req.url);
 * ```
 * @since v0.1.0
 */
export function request(): Request {
  const { req } = getContext();
  return req;
}

/**
 * Retrieves the HTTP request object.
 * @example ```ts
 * const req = getRequest();
 * console.log(req.url);
 * ```
 * @alias of {@link request}
 * @since v0.1.0
 */
export const getRequest = request;

/**
 * Retrieves the HTTP response object.
 */
export function getResponse(): Response {
  return getContext().reply;
}

export const requestURL = once(function getRequestURL() {
  const request = getRequest();
  const host = `${request.protocol}://${request.hostname}`;
  return new URL(request.originalUrl, host);
});

/**
 * @alias of {@link requestURL}
 */
export const getRequestURL = requestURL;

/**
 * Get matched route
 */
export function route() {
  const { routeOptions } = request();
  return routeOptions;
}

/**
 * @alias of {@link route}
 */
export const getRoute = route;

// ============================================================================
// Body
// ============================================================================

/**
 * Retrieves the request body.
 */
export function body<T = unknown>() {
  return getRequest().body as T;
}

/**
 * @alias {@link body}
 */
export const getBody = body;

// ============================================================================
// Params
// ============================================================================

/**
 * Retrieves the request params.
 */
export function params<T = Dict<string>>(): T {
  return getRequest().params as T;
}

params.get = function getParam(name: string) {
  const p = getRequest().params as Dict<string>;
  return p[name];
};

/**
 * Alias of {@link params}.
 *
 * @alias params
 * @see params
 */
export const getParams = params;

/**
 * Retrieves parameters from the current request context.
 *
 * @deprecated Use {@link params.get} instead
 * @example
 * ```ts
 * const id = getParam('id')                              // string | undefined
 * const page = getParam('page', (val) => parseInt(val))  // number | undefined
 * const age = getParam('age', (val) => {
 *   const num = parseInt(val);
 *   if (num < 0) throw new Error('must be positive');
 *   return num;
 * });                                                     // number | undefined
 * ```
 */
export function getParam(name: string): string | undefined;
export function getParam(name: string, transform?: (value: string) => unknown): unknown {
  const params = getParams();
  const value = params[name];

  if (value === undefined) return undefined;
  if (!transform) return value;

  try {
    return transform(value);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "transformation failed";
    throw new NotFoundError(message);
  }
}

// ============================================================================
// Headers
// ============================================================================

export function headers() {
  return getRequest().headers;
}

headers.get = function getHeader(name: HttpHeaderIncoming) {
  return getRequest().headers[name];
};

headers.getAll = function getAllHeaders(name: HttpHeaderIncoming) {
  return getRequest().raw.headersDistinct[name];
};

headers.set = function setHeader(name: HttpHeader, value: string): Response {
  const { reply } = getContext();
  return reply.header(name, value);
};

/**
 * Retrieves the request headers.
 */
export function getHeaders() {
  const { req } = getContext();
  return req.headers;
}

/**
 * Set Request header
 */
export function setHeader(name: HttpHeader, value: string): Response {
  const { reply } = getContext();
  return reply.header(name, value);
}

/**
 * Retrieves a header from the current request context.
 *
 * @deprecated Use {@link headers.get} or {@link headers.getAll} instead
 * @example
 * ```ts
 * const auth = getHeader('authorization')              // string | undefined
 * const token = getHeader('authorization', (arr) => arr[0])  // string | undefined
 * ```
 */
export function getHeader(name: HttpHeaderIncoming): string | undefined;
export function getHeader(name: HttpHeaderIncoming, transform?: (value: string[]) => unknown): unknown {
  const { raw: request } = getRequest();
  const headers = request.headersDistinct as Record<HttpHeaderIncoming, string[]>;
  const value = headers[name];

  if (value === undefined) return undefined;

  try {
    return (transform ?? toFirstValue)(value);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "transformation failed";
    throwAttributeError("Header ", name, message);
  }
}

// ============================================================================
// Search Params / Queries
// ============================================================================

/**
 * Retrieves the search params
 */
export function searchParams<T>() {
  return getRequest().query as T;
}

searchParams.get = function getSearchParam(name: string) {
  const queries = getRequest().query as Record<string, string | string[]>;
  return toFirstValue(queries[name]);
};

export const getSearchParams = searchParams;

/**
 * Retrieves the querystring
 */
export function getQueries<T = ParsedUrlQuery>() {
  return getRequest().query as T;
}

/**
 * Retrieves a search param from the current request context.
 *
 * @deprecated Use {@link searchParams.get} instead
 * @example
 * ```ts
 * const page = getSearchParam('page')                    // string | undefined
 * const pageNum = getSearchParam('page', (val) => {
 *   const num = parseInt(Array.isArray(val) ? val[0] : val);
 *   if (num < 1) throw new Error('must be >= 1');
 *   return num;
 * });                                                     // number | undefined
 * ```
 */
export function getSearchParam(name: string): string | undefined;
export function getSearchParam(name: string, transform?: (value: string | string[]) => unknown): unknown {
  const queries = getRequest().query as Record<string, string | string[]>;
  const value = queries[name];

  if (value === undefined) return undefined;

  try {
    return (transform ?? toFirstValue)(value);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "transformation failed";
    throwAttributeError("Param ", name, message);
  }
}

/**
 * @deprecated please use getSearchParam instead
 */
export const getQuery = getSearchParam;

// ============================================================================
// Status / Redirect / Abort
// ============================================================================

/**
 * Set response status code.
 */
export function status(statusCode: keyof typeof StatusCodes | number): Response {
  if (typeof statusCode !== "number") {
    statusCode = StatusCodes[statusCode];
  }
  const response = getResponse();
  return response.status(statusCode);
}

/**
 * @alias of {@link status}
 */
export const setStatusCode = status;

/**
 * Redirect
 */
export function redirect(path: string, isPermanent?: boolean): never {
  throw new RedirectError(path, isPermanent);
}

/**
 * Abort the request with the given response and statusCode
 */
export function abort(response: ErrorResponse = "Bad Request", statusCode: StatusCode = 400): never {
  throw new HttpError(response, statusCode);
}

/**
 * Abort the request with [Not found] (404)
 */
abort.notFound = function abortNotFound(): never {
  throw new NotFoundError();
};

/**
 * Ensures an error is not an aborted error
 */
abort.assertNot = function assertNotAborted(error: unknown): asserts error is Error {
  if (BaseHttpError.is(error)) {
    throw error;
  }
  if (error instanceof Error) {
    if (error.cause === ResponseAbort) {
      throw error;
    }
    return;
  }
  throw error;
};

/**
 * Ensures an error is an aborted error.
 */
abort.assert = function assertAbort(error: unknown): asserts error is Error {
  if (!BaseHttpError.is(error)) {
    throw error;
  }
};

/**
 * Checks if a given error is an aborted error
 */
abort.is = function isAbortError(error: unknown): error is BaseHttpError {
  return BaseHttpError.is(error);
};
