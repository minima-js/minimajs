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
import { createAttribute } from "./utils/attribute.js";
import { toLastValue } from "./utils/iterable.js";

import { ResponseAbort } from "./internal/response.js";
/**
 * Retrieves the HTTP request object.
 * @example ```ts
 * const req = getRequest();
 * console.log(req.url);
 * ```
 * @since v0.1.0
 */
export function getRequest(): Request {
  const { req } = getContext();
  return req;
}

/**
 * Retrieves the HTTP response object.
 */
export function getResponse(): Response {
  return getContext().reply;
}

/**
 * Retrieves the request body.
 */
export function getBody<T = unknown>() {
  return getRequest().body as T;
}

/**
 * Retrieves the request params.
 */
export function getParams<T = Dict<string>>(): T {
  return getRequest().params as T;
}

export function setStatusCode(statusCode: keyof typeof StatusCodes | number): Response {
  if (typeof statusCode !== "number") {
    statusCode = StatusCodes[statusCode];
  }
  const response = getResponse();
  return response.status(statusCode);
}

export const getRequestURL = once(function getRequestURL() {
  const request = getRequest();
  const host = `${request.protocol}://${request.hostname}`;
  return new URL(request.originalUrl, host);
});

/**
 * Retrieves the request headers.
 */
export function getHeaders() {
  const { req } = getContext();
  return req.headers;
}

/**
 * Retrieves the search params
 */
export const getSearchParams = () => {
  return getRequestURL().searchParams;
};

/**
 * Retrieves the querystring
 */
export function getQueries<T = ParsedUrlQuery>() {
  return getRequest().query as T;
}

/**
 * Set Request header
 */
export function setHeader(name: HttpHeader, value: string): Response {
  const { reply } = getContext();
  return reply.header(name, value);
}
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

function throwAttributeError(accessor: string, name: string, message: string): never {
  throw new ValidationError(accessor + "`" + name + "` " + message);
}
/**
 * Retrieves and validates parameters from the current request context. It optionally casts the values to a specified type and enforces that the parameter is required.
 */
export const getParam = createAttribute<string, string, true>(getParams, abort.notFound, true);

function getHeadersDistinct() {
  const { raw: request } = getRequest();
  return request.headersDistinct as Record<HttpHeaderIncoming, string[]>;
}

/**
 * Retrieves and validates header from the current request context. It optionally casts the values to a specified type and enforces that the header is required.
 */
export const getHeader = createAttribute<string[], string, false, HttpHeaderIncoming>(
  getHeadersDistinct,
  throwAttributeError.bind(this, "Header "),
  false,
  String
);

export const getField = createAttribute(getBody, throwAttributeError.bind(this, "Field "), false);

/**
 * Retrieves and validates search params from the current request context. It optionally casts the values to a specified type and enforces that the search param is required.
 */
export const getSearchParam = createAttribute(
  getQueries as () => Record<string, string | string[]>,
  throwAttributeError.bind(this, "Param "),
  false,
  toLastValue
);

/**
 * @deprecated please use getSearchParam instead
 */
export const getQuery = getSearchParam;

/**
 * Get matched route
 */
export function getRoute() {
  const { routeOptions } = getRequest();
  return routeOptions;
}
