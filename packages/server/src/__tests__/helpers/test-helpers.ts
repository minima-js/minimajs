import type { InjectOptions } from "fastify";
import { mockApp, mockRoute, type InjectResponse } from "../../mock/index.js";

/**
 * Helper to reduce boilerplate when testing routes
 * @example
 * const response = await testRoute(() => {
 *   setHeader("x-custom", "value");
 *   return { message: "ok" };
 * });
 */
export async function testRoute(
  handler: () => any,
  options: InjectOptions = {}
): Promise<InjectResponse> {
  const route = mockRoute(handler, options);
  const [response] = await mockApp(route);
  return response!;
}

/**
 * Helper to test multiple routes in sequence
 */
export async function testRoutes(
  ...handlers: Array<{ handler: () => any; options?: InjectOptions }>
): Promise<InjectResponse[]> {
  const routes = handlers.map(({ handler, options = {} }) =>
    mockRoute(handler, options)
  );
  return await mockApp(...routes);
}

/**
 * Assert that a response has the expected status code
 */
export function expectStatus(response: InjectResponse, statusCode: number) {
  expect(response.statusCode).toBe(statusCode);
}

/**
 * Assert that a response has the expected header
 */
export function expectHeader(response: InjectResponse, name: string, value: string) {
  expect(response.headers[name]).toBe(value);
}

/**
 * Assert that a response has the expected body structure
 */
export function expectBodyToMatch(response: InjectResponse, matcher: any) {
  expect(response.body).toMatchObject(matcher);
}
