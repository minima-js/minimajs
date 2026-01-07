import { StatusCodes } from "http-status-codes";
import type { HeadersInit, ResponseBody } from "../interfaces/response.js";
import { $context } from "./context.js";
import { mergeHeaders } from "../utils/headers.js";
import { runHooks } from "../hooks/store.js";
import type { Context } from "../interfaces/index.js";

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
  const { responseState: resInit } = $context();
  return new Response(data, {
    ...resInit,
    ...options,
    headers: options.headers ? mergeHeaders(resInit.headers, new Headers(options.headers as HeadersInit)) : resInit.headers,
  });
}

export async function createResponse(data: unknown, options: ResponseInit = {}, ctx: Context): Promise<Response> {
  const { app, responseState } = ctx;
  // If data is already a Response, return as-is (no header merging)
  if (data instanceof Response) {
    return data;
  }

  // 1. transform hook
  const transformed = await runHooks.transform(app, data, ctx);

  // 2. serialize
  const body = await app.serialize(transformed, ctx);

  {
    // 3. send hook
    const response = await runHooks.send(app, body, ctx);
    if (response instanceof Response) return response;
  }

  // 4. Create response with merged headers
  const { headers, ...responseInit } = options;
  if (headers) {
    mergeHeaders(responseState.headers, new Headers(headers as HeadersInit));
  }
  return new Response(body, { ...responseState, ...responseInit });
}
