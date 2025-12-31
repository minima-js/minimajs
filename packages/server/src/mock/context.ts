import { wrap } from "../internal/context.js";
import { type Context } from "../interfaces/context.js";
import { createRequest, type MockRequestOptions } from "./request.js";

export type MockContextCallback<T> = (request: Request) => T;

/**
 * Creates a mock context for testing context-based functions.
 * This allows you to test route handlers and context functions in isolation.
 *
 * @example
 * ```ts
 * import { mockContext } from '@minimajs/server/mock';
 * import { body, params } from '@minimajs/server';
 *
 * mockContext(() => {
 *   const user = body();
 *   expect(user.name).toBe("John");
 * }, { body: { name: "John" } });
 *
 * mockContext(() => {
 *   const id = params().id;
 *   expect(id).toBe("123");
 * }, { url: '/users/123', params: { id: '123' } });
 * ```
 *
 * @since v0.2.0
 */
export function mockContext<T>(
  callback: MockContextCallback<T>,
  options: MockRequestOptions & { url?: string; params?: Record<string, string> } = {}
): T {
  const { params = {}, url = "/", ...reqOptions } = options;
  const request = createRequest(url, reqOptions);
  const resInit = { status: 200, headers: new Headers() };
  const urlObj = new URL(request.url);

  // Create mock context
  const context: Context = {
    app: {} as any, // Mock app - users should use app.inject for full integration tests
    url: urlObj,
    request: request,
    responseState: resInit,
    container: new Map(),
    locals: new Map(),
    signal: new AbortController().signal,
    route: (Object.keys(params).length > 0 ? { params, store: { handler: () => {} } } : null) as any,
  };
  return wrap(context, () => callback(request));
}
