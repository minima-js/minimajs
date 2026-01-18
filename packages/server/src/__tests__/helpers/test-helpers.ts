import { createApp } from "../../bun/index.js";
import { createRequest, type MockRequestOptions } from "../../mock/request.js";
import { bodyParser } from "../../plugins/body-parser/index.js";

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
  { url = "/test", path = url, ...options }: MockRequestOptions & { url?: string; path?: string } = {}
): Promise<Response> {
  const app = createApp({ logger: false });
  app.register(bodyParser());
  const method = options.method || "GET";

  switch (method.toUpperCase()) {
    case "GET":
      app.get(path, handler);
      break;
    case "POST":
      app.post(path, handler);
      break;
    case "PUT":
      app.put(path, handler);
      break;
    case "DELETE":
      app.delete(path, handler);
      break;
    case "PATCH":
      app.patch(path, handler);
      break;
    default:
      app.get(path, handler);
  }

  const response = await app.handle(createRequest(url, options));
  await app.close();
  return response;
}
