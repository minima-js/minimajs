import type { InjectOptions, RouteHandlerMethod } from "fastify";
import { createApp, type App } from "../index.js";

export * from "./context.js";
export * from "./request.js";
export * from "./response.js";

type Route = ReturnType<typeof mockRoute>;
type Decorate = (app: App) => unknown;

/**
 * Type representing the response from Fastify's inject method
 * @since v0.2.0
 */
export type InjectResponse = Awaited<ReturnType<App["inject"]>>;

/**
 * Creates a test Fastify app with routes and returns responses.
 * Uses Fastify's built-in inject method for proper request/response lifecycle.
 *
 * @example
 * ```ts
 * const [response] = await mockApp(
 *   mockRoute(() => ({ message: 'hello' }))
 * );
 * expect(response.statusCode).toBe(200);
 * expect(response.body).toEqual({ message: 'hello' });
 * ```
 *
 * @since v0.1.0
 */
export async function mockApp<T extends Route[]>(...routes: T): Promise<InjectResponse[]> {
  const app = createApp({ routes: { log: false }, logger: false });

  // Register all routes
  routes.forEach(([opt, callback, decorate]) => {
    const url = (opt.url as string) ?? "/test";
    const method = opt.method ?? "GET";
    opt.url = url;
    opt.method = method;

    // Apply decorators if provided
    decorate?.(app);

    // Register route
    app.route({
      method,
      url,
      handler: callback,
    });
  });

  // Use Fastify's inject - it handles everything!
  const responses = await Promise.all(
    routes.map(async ([opt]) => {
      const response = await app.inject(opt);

      // Auto-parse JSON responses for convenience
      if (response.headers["content-type"]?.toString().includes("json")) {
        try {
          response.body = JSON.parse(response.payload);
        } catch {
          // If parsing fails, keep original payload
          response.body = response.payload;
        }
      } else {
        response.body = response.payload;
      }

      return response;
    })
  );

  // Clean up
  await app.close();

  return responses;
}

/**
 * Helper to define a route for testing.
 *
 * @example
 * ```ts
 * mockRoute(
 *   () => ({ message: 'hello' }),
 *   { method: 'POST', url: '/users' },
 *   (app) => app.decorate('db', mockDb)
 * )
 * ```
 *
 * @since v0.1.0
 */
export function mockRoute(callback: RouteHandlerMethod, option: InjectOptions = {}, decorate?: Decorate) {
  return [option, callback, decorate] as const;
}
