import { StatusCodes } from "http-status-codes";
import { getContext } from "./context.js";
import { RedirectError, HttpError } from "./error.js";
import type { ParsedUrlQuery } from "node:querystring";
import type { Request, Response } from "./types.js";

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
