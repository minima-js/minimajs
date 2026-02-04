import { context } from "./context.js";

import { RedirectError, HttpError, BaseHttpError, NotFoundError, type HttpErrorOptions } from "./error.js";
import type { HeadersInit, HttpHeader, HttpHeaderIncoming, ResponseBody, ResponseOptions } from "./interfaces/response.js";
import { toStatusCode, type StatusCode } from "./internal/response.js";
import { isAbortError } from "./utils/errors.js";
import { mergeHeaders } from "./utils/headers.js";
import { kBody, kIpAddr } from "./symbols.js";
import type { Dict, RemoteAddr } from "./interfaces/index.js";

// ============================================================================
//  Response
// ============================================================================

/**
 * Creates an HTTP response with serialized body, optional status code, and headers.
 *
 * @example
 * ```ts
 * return response('Hello World');
 * return response(new Blob(['data']));
 * return response(stream, {
 *   status: 'CREATED',
 *   headers: { 'X-Custom': 'value' }
 * });
 * ```
 * @since v0.2.0
 */
export function response(body: ResponseBody, options: ResponseOptions = {}): Response {
  const { responseState } = context();
  if (options.status) {
    responseState.status = toStatusCode(options.status);
  }
  if (options.headers) {
    mergeHeaders(responseState.headers, new Headers(options.headers));
  }
  if (options.statusText !== undefined) {
    responseState.statusText = options.statusText;
  }
  return new Response(body, responseState);
}

/**
 * Response utilities for managing HTTP responses
 * @namespace
 */
export namespace response {
  /**
   * Creates an empty response with the specified status code.
   *
   * @param statusCode - The HTTP status code (number or StatusCodes key)
   * @example
   * ```ts
   * return response.status(204); // No Content
   * return response.status('NO_CONTENT');
   * ```
   * @since v0.2.0
   */
  export function status(statusCode: StatusCode): void {
    const { responseState: res } = context();
    res.status = toStatusCode(statusCode);
  }
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

export const setStatusCode = response.status;
// ============================================================================
// Status / Redirect / Abort
// ============================================================================
/**
 * Redirects to the specified path.
 *
 * @param path - The URL path to redirect to
 * @param isPermanent - Whether the redirect is permanent (301) or temporary (302)
 * @param options - Optional error options including custom headers
 * @throws {RedirectError}
 * @example
 * ```ts
 * redirect('/login');
 * redirect('/new-url', true); // permanent redirect
 * redirect('/login', false, { headers: { 'X-Reason': 'session-expired' } });
 * ```
 * @since v0.2.0
 */
export function redirect(path: string, isPermanent?: boolean, options?: HttpErrorOptions): never {
  throw new RedirectError(path, isPermanent, options);
}

/**
 * Aborts the request with the given response and status code.
 *
 * @param response - The error response message
 * @param statusCode - The HTTP status code (default: 400)
 * @param options - Optional error options including custom headers
 * @throws {HttpError}
 * @example
 * ```ts
 * abort('Unauthorized', 401);
 * abort('Bad Request');
 * abort('Rate limit exceeded', 429, { headers: { 'Retry-After': '60' } });
 *
 * // Or use abort.notFound()
 * abort.notFound();
 * ```
 * @since v0.2.0
 */
export function abort<R>(response: R = "Bad Request" as R, statusCode: StatusCode = 400, options?: HttpErrorOptions): never {
  throw new HttpError<R>(response, statusCode, options);
}

/**
 * Utility functions for working with request aborts and errors
 * @namespace
 */
export namespace abort {
  /**
   * Aborts the request with a 404 Not Found error.
   *
   * @param message - Optional error message
   * @param options - Optional error options including custom headers
   * @throws {NotFoundError}
   * @example
   * ```ts
   * abort.notFound();
   * abort.notFound('User not found');
   * abort.notFound('Resource not found', { headers: { 'X-Resource-Type': 'product' } });
   * ```
   */
  export function notFound(message?: string, options?: HttpErrorOptions): never {
    throw new NotFoundError(message, options);
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
      if (isAbortError(error)) {
        throw error;
      }
      return;
    }
    throw error;
  }

  /**
   * Alias for {@link rethrow}
   * @see {@link rethrow}
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

// ============================================================================
// Request
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
  const { request: req } = context();
  return req;
}

/**
 * Request utilities for accessing request data
 * @namespace
 */
export namespace request {
  /**
   * Retrieves the full request URL.
   *
   * @example
   * ```ts
   * const url = request.url();
   * console.log(url.pathname);
   * ```
   * @since v0.2.0
   */

  export function url(): URL {
    const { $metadata: metadata, request } = context();
    if (metadata.url) return metadata.url;
    metadata.proto ??= "http";
    if (!metadata.host) {
      metadata.host = request.headers.get("host")!;
    }
    const path = request.url.slice(metadata.pathStart);
    metadata.url = new URL(`${metadata.proto}://${metadata.host}${path}`);
    return metadata.url;
  }

  /**
   * Retrieves the client IP address from the request.
   * Requires IP address configuration via request.ip.configure().
   *
   * @returns The client IP address as a string
   * @throws Error if IP address plugin is not configured
   *
   * @example
   * ```ts
   * import { request } from '@minimajs/server';
   *
   * // Then use it in handlers
   * app.get('/api/info', () => {
   *   const clientIp = request.ip();
   *   return { ip: clientIp };
   * });
   * ```
   */
  export function ip(): string | null {
    const { locals } = context();
    let ipAddr = locals[kIpAddr];
    if (ipAddr === undefined) {
      const rAddr = request.remoteAddr();
      ipAddr = rAddr ? rAddr.hostname : null;
      locals[kIpAddr] = ipAddr;
    }
    return ipAddr;
  }

  export function remoteAddr(): RemoteAddr | null {
    const ctx = context();
    return ctx.serverAdapter.remoteAddr(ctx);
  }
}

// ============================================================================
// Body
// ============================================================================

/**
 * Retrieves the request body.
 * Requires bodyParser plugin to be registered.
 *
 * @example
 * ```ts
 * import { bodyParser } from '@minimajs/server/plugins/body-parser';
 * app.register(bodyParser());
 *
 * app.post('/users', () => {
 *   const data = body<{ name: string }>();
 *   console.log(data.name);
 *   return { received: data };
 * });
 * ```
 * @since v0.2.0
 */
export function body<T = unknown>(): T {
  const { locals } = context();
  if (!(kBody in locals)) {
    throw new Error("Body parser is not registered. Please register bodyParser plugin first.");
  }
  return locals[kBody] as T;
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
  const { route } = context();
  if (!route) {
    return {} as T;
  }
  return route.params as T;
}

/**
 * Utility functions for working with route parameters
 * @namespace
 */
export namespace params {
  /**
   * Retrieves a single param by name with optional transformation.
   * Throws NotFoundError if the param is not found.
   *
   * @example
   * ```ts
   * const id = params.get('id');                              // string
   * const page = params.get('page', (val) => parseInt(val));  // number
   * const age = params.get('age', (val) => {
   *   const num = parseInt(val);
   *   if (num < 0) throw new Error('must be positive');
   *   return num;
   * });                                                        // number
   * ```
   */
  export function get(name: string): string;
  export function get<R>(name: string, transform: (value: string) => R): R;
  export function get(name: string, transform?: (value: string) => unknown): unknown {
    const value = params()[name];
    if (value === undefined) {
      abort.notFound();
    }
    if (!transform) return value;
    const tValue = transform(value);
    if (Number.isNaN(tValue)) abort.notFound();
    return tValue;
  }

  /**
   * Retrieves a single param by name with optional transformation.
   * Returns undefined if the param is not found.
   *
   * @example
   * ```ts
   * const id = params.option('id');                              // string | undefined
   * const page = params.option('page', (val) => parseInt(val));  // number | undefined
   * ```
   */
  export function optional(name: string): string | undefined;
  export function optional<R>(name: string, transform: (value: string) => R): R | undefined;
  export function optional(name: string, transform?: (value: string) => unknown): unknown {
    const value = params()[name];
    if (value === undefined) return undefined;
    if (!transform) return value;
    const tValue = transform(value);
    if (Number.isNaN(tValue)) abort.notFound();
    return tValue;
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
  return Object.fromEntries(request().headers);
}

/**
 * Utility functions for working with HTTP headers
 * @namespace
 */
export namespace headers {
  /**
   * Retrieves a single header value by name with optional transformation.
   * Throws ValidationError if the header is not found.
   *
   * @param name - The header name to retrieve
   * @example
   * ```ts
   * const auth = headers.get('authorization');                              // string
   * const token = headers.get('authorization', (val) => val.split(' ')[1]); // string
   * ```
   */
  export function get(name: HttpHeaderIncoming): string | undefined;
  export function get<R>(name: HttpHeaderIncoming, transform: (value: string) => R): R | undefined;
  export function get(name: HttpHeaderIncoming, transform?: (value: string) => unknown): unknown {
    const value = request().headers.get(name);
    if (value === null) {
      return value;
    }
    if (!transform) return value;
    return transform(value);
  }

  /**
   * Retrieves all values for a header name with optional transformation.
   * Returns an empty array if the header is not found.
   *
   * @param name - The header name to retrieve
   * @example
   * ```ts
   * const cookies = headers.getAll('cookie');                        // string[]
   * const parsed = headers.getAll('cookie', (val) => val.split('=')); // string[][]
   * ```
   */
  export function getAll(name: HttpHeaderIncoming): string[];
  export function getAll<R>(name: HttpHeaderIncoming, transform: (value: string) => R): R[];
  export function getAll(name: HttpHeaderIncoming, transform?: (value: string) => unknown): unknown[] {
    // Web Standards Headers.getAll() only supports 'set-cookie'
    // For other headers, we need to split the value manually
    const value = request().headers.get(name);
    if (value === null) {
      return [];
    }
    // If it's set-cookie, use getAll
    if (name.toLowerCase() === "set-cookie") {
      const values = request().headers.getAll("set-cookie" as any);
      if (!transform) return values;
      return values.map(transform);
    }
    // For other headers, split by comma (HTTP standard)
    const values = value.split(",").map((v) => v.trim());
    if (!transform) return values;
    return values.map(transform);
  }

  /**
   * Sets a single response header.
   *
   * @param name - The header name to set
   * @param value - The header value
   * @example
   * ```ts
   * headers.set('x-custom-header', 'value');
   * ```
   */
  export function set(name: HttpHeader, value: string): void;
  /**
   * Sets multiple response headers from a HeadersInit object.
   *
   * @param headers - Headers to set (object, array of tuples, or Headers instance)
   * @example
   * ```ts
   * // Object
   * headers.set({ 'x-custom': 'value', 'x-another': 'value2' });
   *
   * // Array of tuples
   * headers.set([['x-custom', 'value'], ['x-another', 'value2']]);
   *
   * // Headers instance
   * headers.set(new Headers({ 'x-custom': 'value' }));
   * ```
   */
  export function set(headers: HeadersInit): void;
  export function set(headers: HttpHeader, value: string): void;
  export function set(name: HttpHeader | HeadersInit, value?: string): void {
    const { responseState: res } = context();

    // If name is a string, set single header
    if (typeof name === "string") {
      if (value === undefined) {
        throw new Error("Value is required when setting a single header");
      }
      res.headers.set(name, value);
      return;
    }

    // Otherwise, handle HeadersInit (object, array, or Headers instance)
    mergeHeaders(res.headers, new Headers(name));
  }

  /**
   * Appends a response header (useful for headers that can have multiple values like Set-Cookie).
   *
   * @param name - The header name to append
   * @param value - The header value
   * @example
   * ```ts
   * headers.append('Set-Cookie', 'sessionId=abc123');
   * headers.append('Set-Cookie', 'theme=dark');
   * ```
   */
  export function append(name: HttpHeader, value: string): void {
    const { responseState: resInit } = context();
    resInit.headers.append(name, value);
  }
}

// ============================================================================
// Search Params / Queries
// ============================================================================

const kSearchParams = Symbol();
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
export function searchParams<T extends Record<string, string>>(): T {
  const ctx = context();
  let queries = ctx.locals[kSearchParams] as T;
  if (!queries) {
    queries = Object.fromEntries(request.url().searchParams) as T;
    ctx.locals[kSearchParams] = queries;
  }
  return queries;
}

/**
 * Utility functions for working with URL search parameters (query string)
 * @namespace
 */
export namespace searchParams {
  /**
   * Retrieves a single search param by name with optional transformation.
   * Throws ValidationError if the param is not found.
   *
   * @param name - The query parameter name to retrieve
   * @example
   * ```ts
   * const page = searchParams.get('page');                              // string
   * const pageNum = searchParams.get('page', (val) => parseInt(val));   // number
   * ```
   */
  export function get(name: string): string | undefined;
  export function get<R>(name: string, transform: (value: string) => R): R;
  export function get(name: string, transform?: (value: string) => unknown): unknown {
    const url = request.url();
    const value = url.searchParams.get(name);
    if (value === null) {
      return null;
    }
    if (!transform) return value;
    return transform(value);
  }

  /**
   * Retrieves all values for a search param by name with optional transformation.
   * Returns an empty array if the param is not found.
   *
   * @param name - The query parameter name to retrieve
   * @example
   * ```ts
   * const tags = searchParams.getAll('tag');                           // string[]
   * const tagIds = searchParams.getAll('tag', (val) => parseInt(val)); // number[]
   * ```
   */
  export function getAll(name: string): string[];
  export function getAll<R>(name: string, transform: (value: string) => R): R[];
  export function getAll(name: string, transform?: (value: string) => unknown): unknown[] {
    const url = request.url();
    const values = url.searchParams.getAll(name);
    if (!transform) return values;
    return values.map(transform);
  }
}
