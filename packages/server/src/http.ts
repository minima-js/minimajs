import { StatusCodes } from "http-status-codes";
import { getContext } from "./context.js";
import { RedirectError, HttpError } from "./error.js";
import type { ParsedUrlQuery } from "node:querystring";
import type { Dict, Request, Response } from "./types.js";

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

type CastTo<T> = (value: unknown) => T;

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
export function getParam(name: string, cast?: any, required = true): any {
  const params = getRequest().params as any;
  const value = params[name];
  if (required && !value) {
    abort("Not Found", 404);
  }
  if (cast === Number) {
    if (!value) {
      return value;
    }
    if (isNaN(value)) {
      abort("Not Found", "NOT_FOUND");
    }
    return Number(value);
  }
  return value;
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

export function getQuery<T>(name: string): T {
  const queries = getQueries();
  return queries[name] as T;
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
