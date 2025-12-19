import { wrap } from "../internal/index.js";
import type { Request, Response } from "../types.js";
import { createRequest, type MockRequestOptions } from "./request.js";
import { createResponse } from "./response.js";

export type MockContextCallback<T> = (request: Request, response: Response) => T;

/**
 * Creates a mock context for testing context-based functions.
 * This is a lightweight approach suitable for unit testing individual functions.
 *
 * For integration tests that need full Fastify lifecycle (hooks, decorators, etc.),
 * use mockApp/mockRoute or Fastify's inject method directly instead.
 *
 * @example ```ts
 * mockContext(() => {
 *   const user = body();
 *   expect(user.name).toBe("John");
 * }, { body: { name: "John" } });
 * ```
 *
 * @since v0.1.0
 */
export function mockContext<T>(callback: MockContextCallback<T>, reqOptions: MockRequestOptions = {}): T {
  const request = createRequest(reqOptions);
  const response = createResponse({ request: request });
  return wrap(request, response, () => callback(request, response)) as T;
}
