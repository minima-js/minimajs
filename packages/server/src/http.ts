import { StatusCodes } from "http-status-codes";
import { getContext } from "./context.js";
import {
  RedirectError,
  HttpError,
  BaseHttpError,
  ValidationError,
} from "./error.js";
import type { ParsedUrlQuery } from "node:querystring";
import type { Dict, Request, Response } from "./types.js";
import { createAttribute } from "./utils/attribute.js";

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

export function setStatusCode(
  statusCode: keyof typeof StatusCodes | number
): Response {
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

export function getQueries<T = ParsedUrlQuery>() {
  return getRequest().query as T;
}

export const getParam = createAttribute<string, string>(
  getParams,
  () => {
    abort("Not Found", 404);
  },
  true
);

export const getHeader = createAttribute<string | undefined, string>(
  getHeaders,
  throwAttributeError
);

export const getQuery = createAttribute<string | undefined, string>(
  getQueries,
  throwAttributeError,
  false,
  (val) => (val === undefined ? val : String(val))
);

export const getField = createAttribute<unknown | undefined, unknown>(
  getBody,
  throwAttributeError
);

export function setHeader(name: string, value: string): Response {
  const { reply } = getContext();
  return reply.header(name, value);
}

export function redirect(path: string, isPermanent?: boolean): never {
  throw new RedirectError(path, isPermanent);
}

export function abort(
  message: string,
  statusCode: keyof typeof StatusCodes | number
): never {
  throw new HttpError(message, statusCode);
}

abort.assert = function assertAbort(error: unknown): asserts error is Error {
  if (BaseHttpError.is(error)) {
    throw error;
  }
  if (error instanceof Error) {
    return;
  }
  throw error;
};

abort.is = function isAbortError(error: unknown): error is BaseHttpError {
  return BaseHttpError.is(error);
};

function throwAttributeError(name: string, message: string): never {
  throw new ValidationError(`${name}: ${message}`);
}
