import type { ParsedUrlQuery } from "node:querystring";
import { StatusCodes } from "http-status-codes";
import { getContext } from "./context.js";
import {
  RedirectError,
  HttpError,
  BaseHttpError,
  ValidationError,
  NotFoundError,
  type ErrorResponse,
  type StatusCode,
} from "./error.js";
import type { Dict, HttpHeader, Request, Response } from "./types.js";
import { createAttribute } from "./utils/attribute.js";
import { toLastValue } from "./utils/iterable.js";

export function getRequest(): Request {
  const { req } = getContext();
  return req;
}

export function getResponse(): Response {
  return getContext().reply;
}

export function getBody<T = unknown>() {
  return getRequest().body as T;
}

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

export function getHeaders() {
  const { req } = getContext();
  return req.headers;
}

export function getSearchParams<T = ParsedUrlQuery>() {
  return getRequest().query as T;
}

/**
 * @deprecated please use getSearchParams instead
 */
export const getQueries = getSearchParams;

export function setHeader(name: HttpHeader, value: string): Response {
  const { reply } = getContext();
  return reply.header(name, value);
}

export function redirect(path: string, isPermanent?: boolean): never {
  throw new RedirectError(path, isPermanent);
}

export function abort(response: ErrorResponse, statusCode: StatusCode = 400): never {
  throw new HttpError(response, statusCode);
}

abort.notFound = function abortNotFound(): never {
  throw new NotFoundError();
};

abort.$404 = abort.notFound;

abort.assertNot = function assertNotAbort(error: unknown): asserts error is Error {
  if (BaseHttpError.is(error)) {
    throw error;
  }
  if (error instanceof Error) {
    return;
  }
  throw error;
};

abort.assert = function assertAbort(error: unknown): asserts error is Error {
  if (!BaseHttpError.is(error)) {
    throw error;
  }
};

abort.is = function isAbortError(error: unknown): error is BaseHttpError {
  return BaseHttpError.is(error);
};

function throwAttributeError(name: string, message: string): never {
  throw new ValidationError(`${name}: ${message}`);
}

export const getParam = createAttribute(getParams, abort.notFound, true);

export const getHeader = createAttribute<string, false>(getHeaders as () => Dict<string>, throwAttributeError, false);

export const getField = createAttribute(getBody, throwAttributeError, false);

export const getSearchParam = createAttribute<string, false>(getSearchParams, throwAttributeError, false, toLastValue);

/**
 * @deprecated please use getSearchParam instead
 */
export const getQuery = getSearchParam;
