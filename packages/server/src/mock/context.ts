import { wrap } from "../internal/context.js";
import { type Context } from "../interfaces/context.js";
import { createRequest, type MockRequestOptions } from "./request.js";
import { kBody } from "../symbols.js";
import { parseRequestURL } from "../utils/request.js";

export type MockContextCallback<T, S> = (ctx: Context<S>) => T;

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
export function mockContext<S = unknown, T = void>(
  callback: MockContextCallback<T, S>,
  options: MockRequestOptions & { url?: string; params?: Record<string, string> } = {}
): T {
  const { params = {}, url = "/", ...reqOptions } = options;
  const request = createRequest(url, reqOptions);
  const resInit = { status: 200, headers: new Headers() };
  const { pathname } = parseRequestURL(request);

  // Create mock context
  const context: Context<S> = {
    server: null as any,
    app: null as any, // Mock app - users should use app.handle for full integration tests
    url,
    pathname,
    request: request,
    responseState: resInit,
    container: {},
    locals: {},
    route: (Object.keys(params).length > 0 ? { params, store: { handler: () => {} } } : null) as any,
    incomingMessage: undefined as any,
    serverResponse: undefined as any,
  };

  if (reqOptions.body) {
    context.locals[kBody] = reqOptions.body;
  }

  return wrap(context, () => callback(context));
}
