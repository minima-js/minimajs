import { StatusCodes } from "http-status-codes";
import type { HeadersInit, ResponseBody } from "../interfaces/response.js";
import { context } from "./context.js";
import { mergeHeaders } from "../utils/headers.js";

export type StatusCode = keyof typeof StatusCodes | number;

/**
 * Converts a StatusCode (number or named status code) to a numeric status code
 * @param code - Status code as number or StatusCodes key
 * @returns Numeric status code
 */
export function toStatusCode(code: StatusCode): number {
  return typeof code === "number" ? code : StatusCodes[code];
}

export function createResponseFromState(data: ResponseBody, options: ResponseInit): Response {
  const { resInit } = context();
  return new Response(data, {
    ...resInit,
    ...options,
    headers: options.headers
      ? mergeHeaders(resInit.headers, new Headers(options.headers as HeadersInit))
      : resInit.headers,
  });
}
