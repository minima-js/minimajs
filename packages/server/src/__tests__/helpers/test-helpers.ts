import { createApp } from "../../bun/index.js";
import { createRequest, type MockRequestOptions } from "../../mock/request.js";
import { bodyParser } from "../../plugins/body-parser.js";

/**
 * Helper to reduce boilerplate when testing routes
 * @example
 * const response = await testRoute(() => {
 *   headers.set("x-custom", "value");
 *   return { message: "ok" };
 * });
 */
export async function testRoute(
  handler: () => any,
  { url = "/test", ...options }: MockRequestOptions & { url?: string } = {}
): Promise<Response> {
  const app = createApp({ logger: false });
  app.register(bodyParser());
  const method = options.method || "GET";

  switch (method.toUpperCase()) {
    case "GET":
      app.get(url, handler);
      break;
    case "POST":
      app.post(url, handler);
      break;
    case "PUT":
      app.put(url, handler);
      break;
    case "DELETE":
      app.delete(url, handler);
      break;
    case "PATCH":
      app.patch(url, handler);
      break;
    default:
      app.get(url, handler);
  }

  const response = await app.inject(createRequest(url, options));
  await app.close();
  return response;
}

/**
 * Assert that a response has the expected status code
 */
export function expectStatus(response: Response, statusCode: number) {
  expect(response.status).toBe(statusCode);
}

/**
 * Assert that a response has the expected header
 */
export function expectHeader(response: Response, name: string, value: string) {
  expect(response.headers.get(name)).toBe(value);
}

/**
 * Assert that a response has the expected body structure
 */
export async function expectBodyToMatch(response: Response, matcher: any) {
  const body = await response.json();
  expect(body).toMatchObject(matcher);
}
