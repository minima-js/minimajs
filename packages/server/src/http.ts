import { StatusCodes } from "http-status-codes";
import { getContext } from "./context.js";
import { RedirectError, HttpError, ValidationError } from "./error.js";
import type { ParsedUrlQuery } from "node:querystring";
import type { Dict, Request, Response } from "./types.js";
import { validateAndCast, type CastTo } from "./utils/validate.js";

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

export function getParam(name: string): string;
export function getParam<T>(
  name: string,
  cast: null,
  required: false
): string | undefined;
export function getParam<T>(
  name: string,
  cast: CastTo<T>,
  required: false
): T | undefined;
export function getParam<T>(name: string, cast: CastTo<T>): T;
export function getParam<T>(
  name: string,
  cast?: CastTo<T> | null,
  required = true
): T {
  const params = getRequest().params as any;
  try {
    return validateAndCast(params[name], cast!, required);
  } catch (err) {
    abort("Not Found", 404);
  }
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

export function getHeader<T = string | undefined>(name: string) {
  const headers = getHeaders();
  return headers[name] as T;
}

export function getQueries<T = ParsedUrlQuery>() {
  return getRequest().query as T;
}

export function getQuery(name: string): string | undefined;
export function getQuery(name: string, cast: null, required: true): string;
export function getQuery<T>(name: string, castTo: CastTo<T>): T | undefined;
export function getQuery<T>(name: string, castTo: CastTo<T>, required: true): T;
export function getQuery<T>(name: string, castTo: [CastTo<T>]): T[] | undefined;
export function getQuery<T>(
  name: string,
  castTo: [CastTo<T>],
  required: true
): T[];
export function getQuery<T>(
  name: string,
  cast?: CastTo<T> | [CastTo<T>] | null,
  required = false
) {
  const queries = getQueries();
  try {
    return validateAndCast(queries[name], cast!, required);
  } catch (err) {
    assertError(err);
    throw new ValidationError(`[${name}]: ${err.message}`);
  }
}

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

export function assertError(err: unknown): asserts err is Error {
  if (err instanceof Error) {
    return;
  }
  throw err;
}
