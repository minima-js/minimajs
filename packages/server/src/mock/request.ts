import { Readable } from "node:stream";
import { isAsyncIterator, isIterator } from "../utils/iterable.js";

/**
 * Creates a mock Request object for testing.
 *
 * @example
 * ```ts
 * // Simple GET request
 * const req = createRequest('/users');
 *
 * // POST request with JSON body
 * const req = createRequest('/users', {
 *   method: 'POST',
 *   body: { name: 'John' }
 * });
 *
 * // With query parameters
 * const req = createRequest('/users', {
 *   query: { page: '1', limit: '10' }
 * });
 *
 * // With custom headers
 * const req = createRequest('/users', {
 *   headers: { 'authorization': 'Bearer token' }
 * });
 * ```
 *
 * @since v0.2.0
 */
export interface MockRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export function createRequest(url: string, options: MockRequestOptions = {}): Request {
  const { method = "GET", headers = {}, body, query } = options;

  // Build URL with query parameters
  let fullUrl = url;
  if (query) {
    const queryString = new URLSearchParams(query).toString();
    fullUrl = url.includes("?") ? `${url}&${queryString}` : `${url}?${queryString}`;
  }

  // Ensure URL is properly formatted
  if (!fullUrl.startsWith("http")) {
    fullUrl = `http://localhost${fullUrl.startsWith("/") ? "" : "/"}${fullUrl}`;
  }

  // Build request init
  const requestInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };
  // Handle body
  if (body !== undefined) {
    requestInit.body = prepareBody(body, requestInit.headers as Headers);
  }
  return new Request(fullUrl, requestInit);
}

function prepareBody(body: unknown, headers: Headers): RequestInit["body"] {
  if (typeof body === "string" || body instanceof ReadableStream || body instanceof ArrayBuffer) return body;

  if (isAsyncIterator(body) || isIterator(body)) {
    body = Readable.from(body);
  }

  if (body instanceof Readable) {
    return Readable.toWeb(body);
  }

  headers.set("Content-Type", "application/json");
  return JSON.stringify(body);
}
