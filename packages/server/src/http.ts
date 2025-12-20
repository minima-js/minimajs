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
import { toArray, toFirstValue } from "./utils/iterable.js";

// ============================================================================
// Request / Response
// ============================================================================

/**
 * Retrieves the HTTP request object.
 * @example
 * ```ts
 * const req = request();
 * console.log(req.url);
 * ```
 * @since v0.2.0
 */
export function request(): Request {
  const { req } = getContext();
  return req;
}

/**
 * Retrieves the HTTP request object.
 *
 * @example
 * ```ts
 * const req = getRequest();
 * console.log(req.url);
 * ```
 * @see {@link request}
 * @since v0.1.0
 * @internal
 */
export const getRequest = request;

/**
 * Retrieves the HTTP response object.
 *
 * @example
 * ```ts
 * const res = response();
 * res.status(200);
 * ```
 * @since v0.2.0
 */
export function response(): Response {
  return getContext().reply;
}

/**
 * Retrieves the full request URL.
 *
 * @example
 * ```ts
 * const url = requestURL();
 * console.log(url.pathname);
 * ```
 * @since v0.2.0
 */
export const requestURL: () => URL = once(function getRequestURL() {
  const request = getRequest();
  const host = `${request.protocol}://${request.hostname}`;
  return new URL(request.originalUrl, host);
});

/**
 * Retrieves the full request URL.
 *
 * @example
 * ```ts
 * const url = getRequestURL();
 * console.log(url.pathname);
 * ```
 * @see {@link requestURL}
 * @since v0.1.0
 * @internal
 */
export const getRequestURL = requestURL;

/**
 * Retrieves the matched route options.
 *
 * @example
 * ```ts
 * const routeOpts = route();
 * console.log(routeOpts.url);
 * ```
 * @since v0.2.0
 */
export function route() {
  const { routeOptions } = request();
  return routeOptions;
}

/**
 * Retrieves the matched route options.
 *
 * @example
 * ```ts
 * const routeOpts = getRoute();
 * console.log(routeOpts.url);
 * ```
 * @see {@link route}
 * @since v0.1.0
 * @internal
 */
export const getRoute = route;

// ============================================================================
// Body
// ============================================================================

/**
 * Retrieves the request body.
 *
 * @example
 * ```ts
 * const data = body<{ name: string }>();
 * console.log(data.name);
 * ```
 * @since v0.2.0
 */
export function body<T = unknown>() {
  return getRequest().body as T;
}

/**
 * Retrieves the request body.
 *
 * @example
 * ```ts
 * const data = getBody<{ name: string }>();
 * console.log(data.name);
 * ```
 * @see {@link body}
 * @since v0.1.0
 * @internal
 */
export const getBody = body;

// ============================================================================
// Params
// ============================================================================

/**
 * Retrieves the request params.
 *
 * @example
 * ```ts
 * const p = params<{ id: string }>();
 * console.log(p.id);
 *
 * // Or use params.get
 * const id = params.get('id');
 * ```
 * @since v0.2.0
 */
export function params<T = Dict<string>>(): T {
  return getRequest().params as T;
}

/**
 * Utility functions for working with route parameters
 */
export namespace params {
  /**
   * Retrieves a single param by name.
   *
   * @example
   * ```ts
   * const id = params.get('id');
   * ```
   */
  export function get(name: string): string | undefined {
    const p = getRequest().params as Dict<string>;
    return p[name];
  }
}

/**
 * Retrieves the request params.
 *
 * @example
 * ```ts
 * const p = getParams<{ id: string }>();
 * console.log(p.id);
 * ```
 * @see {@link params}
 * @since v0.1.0
 * @internal
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
export function getParam<R>(name: string, transform: (value: string) => R): R;
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

/**
 * Retrieves the request headers.
 *
 * @example
 * ```ts
 * const h = headers();
 * console.log(h['content-type']);
 *
 * // Or use headers.get
 * const auth = headers.get('authorization');
 *
 * // Or use headers.getAll for all values
 * const cookies = headers.getAll('cookie');
 *
 * // Set a header
 * headers.set('x-custom', 'value');
 * ```
 * @since v0.2.0
 */
export function headers() {
  return getRequest().headers;
}

/**
 * Utility functions for working with HTTP headers
 */
export namespace headers {
  /**
   * Retrieves a single header value by name.
   *
   * @param name - The header name to retrieve
   * @example
   * ```ts
   * const auth = headers.get('authorization');
   * ```
   */
  export function get(name: HttpHeaderIncoming): string | undefined {
    return toFirstValue(getRequest().headers[name]);
  }

  /**
   * Retrieves all values for a header name.
   *
   * @param name - The header name to retrieve
   * @example
   * ```ts
   * const cookies = headers.getAll('cookie');
   * ```
   */
  export function getAll(name: HttpHeaderIncoming): string[] | undefined {
    return getRequest().raw.headersDistinct[name];
  }

  /**
   * Sets a response header.
   *
   * @param name - The header name to set
   * @param value - The header value
   * @example
   * ```ts
   * headers.set('x-custom-header', 'value');
   * ```
   */
  export function set(name: HttpHeader, value: string): Response {
    const { reply } = getContext();
    return reply.header(name, value);
  }
}

/**
 * Retrieves the request headers.
 *
 * @example
 * ```ts
 * const h = getHeaders();
 * console.log(h['content-type']);
 * ```
 * @see {@link headers}
 * @since v0.1.0
 */
export function getHeaders() {
  const { req } = getContext();
  return req.headers;
}

/**
 * Sets a response header.
 *
 * @param name - The header name to set
 * @param value - The header value
 * @example
 * ```ts
 * setHeader('x-custom-header', 'value');
 * ```
 * @see {@link headers.set}
 * @since v0.1.0
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
export function getHeader<R>(name: HttpHeaderIncoming, transform: (value: string[]) => R): R;
export function getHeader(name: HttpHeaderIncoming, transform?: (value: string[]) => unknown): unknown {
  const { raw: request } = getRequest();
  const headers = request.headersDistinct as Record<HttpHeaderIncoming, string[]>;
  const value = headers[name];

  if (value === undefined) return undefined;

  try {
    return (transform ?? toFirstValue)(value);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "transformation failed";
    throw new ValidationError("Header `" + name + "` " + message);
  }
}

// ============================================================================
// Search Params / Queries
// ============================================================================

/**
 * Retrieves the search params (query string).
 *
 * @example
 * ```ts
 * const query = searchParams<{ page: string }>();
 * console.log(query.page);
 *
 * // Or use searchParams.get
 * const page = searchParams.get('page');
 * ```
 * @since v0.2.0
 */
export function searchParams<T>() {
  return getRequest().query as T;
}

/**
 * Utility functions for working with URL search parameters (query string)
 */
export namespace searchParams {
  /**
   * Retrieves a single search param by name.
   *
   * @param name - The query parameter name to retrieve
   * @example
   * ```ts
   * const page = searchParams.get('page');
   * ```
   */
  export function get(name: string): string | undefined {
    const queries = getRequest().query as Record<string, string | string[]>;
    return toFirstValue(queries[name]);
  }

  /**
   * Retrieves all values for a search param by name.
   *
   * @param name - The query parameter name to retrieve
   * @example
   * ```ts
   * const tags = searchParams.getAll('tag');
   * ```
   */
  export function getAll(name: string): string[] {
    const queries = getRequest().query as Record<string, string | string[]>;
    if (!queries[name]) return [];
    return toArray(queries[name]);
  }
}

/**
 * Retrieves the search params (query string).
 *
 * @example
 * ```ts
 * const query = getSearchParams<{ page: string }>();
 * console.log(query.page);
 * ```
 * @see {@link searchParams}
 * @since v0.1.0
 * @internal
 */
export const getSearchParams = searchParams;

/**
 * Retrieves the query string parameters.
 *
 * @example
 * ```ts
 * const query = getQueries<{ page: string }>();
 * console.log(query.page);
 * ```
 * @see {@link searchParams}
 * @since v0.1.0
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
export function getSearchParam<R>(name: string, transform: (value: string) => R): R;
export function getSearchParam(name: string, transform?: (value: string) => unknown): unknown {
  const queries = getRequest().query as Record<string, string | string[]>;
  const value = queries[name];

  if (value === undefined) return undefined;

  try {
    return (transform ?? toFirstValue)(toFirstValue(value));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "transformation failed";
    throw new ValidationError("Param `" + name + "` " + message);
  }
}

/**
 * Retrieves a search param from the current request context.
 *
 * @deprecated Use {@link searchParams.get} instead
 * @see {@link getSearchParam}
 * @internal
 */
export const getQuery = getSearchParam;

// ============================================================================
// Status / Redirect / Abort
// ============================================================================

/**
 * Sets the response status code.
 *
 * @param statusCode - The HTTP status code (number or StatusCodes key)
 * @example
 * ```ts
 * status(200);
 * status('CREATED');
 * ```
 * @since v0.2.0
 */
export function status(statusCode: keyof typeof StatusCodes | number): Response {
  if (typeof statusCode !== "number") {
    statusCode = StatusCodes[statusCode];
  }
  return response().status(statusCode);
}

/**
 * Sets the response status code.
 *
 * @param statusCode - The HTTP status code (number or StatusCodes key)
 * @example
 * ```ts
 * setStatusCode(200);
 * setStatusCode('CREATED');
 * ```
 * @see {@link status}
 * @since v0.1.0
 * @internal
 */
export const setStatusCode = status;

/**
 * Redirects to the specified path.
 *
 * @param path - The URL path to redirect to
 * @param isPermanent - Whether the redirect is permanent (301) or temporary (302)
 * @throws {RedirectError}
 * @example
 * ```ts
 * redirect('/login');
 * redirect('/new-url', true); // permanent redirect
 * ```
 * @since v0.2.0
 */
export function redirect(path: string, isPermanent?: boolean): never {
  throw new RedirectError(path, isPermanent);
}

/**
 * Aborts the request with the given response and status code.
 *
 * @param response - The error response message
 * @param statusCode - The HTTP status code (default: 400)
 * @throws {HttpError}
 * @example
 * ```ts
 * abort('Unauthorized', 401);
 * abort('Bad Request');
 *
 * // Or use abort.notFound()
 * abort.notFound();
 * ```
 * @since v0.2.0
 */
export function abort(response: ErrorResponse = "Bad Request", statusCode: StatusCode = 400): never {
  throw new HttpError(response, statusCode);
}

/**
 * Utility functions for working with request aborts and errors
 */
export namespace abort {
  /**
   * Aborts the request with a 404 Not Found error.
   *
   * @throws {NotFoundError}
   * @example
   * ```ts
   * abort.notFound();
   * ```
   */
  export function notFound(): never {
    throw new NotFoundError();
  }

  /**
   * Ensures an error is not an aborted error.
   * If it is an aborted error, re-throws it.
   *
   * @param error - The error to check
   * @example
   * ```ts
   * try {
   *   // some code
   * } catch (err) {
   *   abort.rethrow(err);
   *   // handle non-abort errors
   * }
   * ```
   */
  export function rethrow(error: unknown): asserts error is Error {
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
  }

  /**
   * @alias of {@link rethrow}
   * @internal
   */
  export const assertNot = rethrow;

  /**
   * Ensures an error is an aborted error.
   * If not, re-throws it.
   *
   * @param error - The error to check
   * @example
   * ```ts
   * try {
   *   // some code
   * } catch (err) {
   *   abort.assert(err);
   *   // handle abort errors only
   * }
   * ```
   */
  export function assert(error: unknown): asserts error is Error {
    if (!BaseHttpError.is(error)) {
      throw error;
    }
  }

  /**
   * Checks if a given error is an aborted error.
   *
   * @param error - The error to check
   * @returns True if the error is a BaseHttpError
   * @example
   * ```ts
   * if (abort.is(error)) {
   *   console.log('Request was aborted');
   * }
   * ```
   */
  export function is(error: unknown): error is BaseHttpError {
    return BaseHttpError.is(error);
  }
}
