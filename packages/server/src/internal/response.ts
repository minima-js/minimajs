import { StatusCodes } from "http-status-codes";
import type { HeadersInit, ResponseBody } from "../interfaces/response.js";
import { $context } from "./context.js";
import { mergeHeaders } from "../utils/headers.js";
import { runHooks } from "../hooks/store.js";

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
    headers: options.headers
      ? mergeHeaders(resInit.headers, new Headers(options.headers as HeadersInit))
      : resInit.headers,
  });
}
export async function createResponse(data: unknown, options: ResponseInit = {}): Promise<Response> {
  const ctx = $context();
  const { app, request: req, responseState: resInit } = ctx;
  if (options.headers) {
    mergeHeaders(resInit.headers, new Headers(options.headers as HeadersInit));
  }
  if (options.status) {
    resInit.status = options.status;
  }
  // If data is already a Response, return as-is (no header merging)
  if (data instanceof Response) {
    await runHooks(app, "sent", ctx);
    return data;
  }

  // 1. transform hook
  const transformed = runHooks.transform(app, data, ctx);

  // 2. serialize
  const body = await app.serialize(transformed, ctx);

  {
    // 3. send hook
    const response = await runHooks(app, "send", body, req);
    if (response instanceof Response) return response;
  }

  // 5. Create response with merged headers
  const response = new Response(body, resInit);

  // 6. sent hook
  await runHooks(app, "sent", req);

  return response;
}
