import { type Instance, type HTTPMethod, type HTTPVersion } from "find-my-way";
import { type App, type RouteHandler } from "../interfaces/app.js";
import { type Route } from "../interfaces/route.js";
import { runHooks, getHooks } from "../hooks/store.js";
import { $context, wrap, type Context } from "./context.js";
import { NotFoundError } from "../error.js";
import { createResponse } from "./response.js";
import { result2route } from "./route.js";
import type { RouteFindResult } from "../interfaces/route.js";

export async function handleRequest<T>(
  server: App<T>,
  router: Instance<HTTPVersion.V1>,
  req: Request
): Promise<Response> {
  const url = new URL(req.url);
  const result: RouteFindResult<T> | null = router.find(req.method as HTTPMethod, url.pathname);
  let route: Route | null = null;
  let app = server;

  const locals = new Map<symbol, unknown>();

  if (result) {
    route = result2route(result);
    app = result.store.server;
  }

  const ctx: Context = {
    app,
    url,
    route,
    locals,
    container: app.container,
    req,
    signal: req.signal,
    resInit: { headers: new Headers() }, // Initialize mutable response headers
  };

  return wrap(ctx, async () => {
    try {
      {
        // 1. request hook (runs for all requests, even not-found routes)
        const response = await runHooks(app, "request", req);
        if (response instanceof Response) {
          return response;
        }
      }
      // Route not found
      if (!route) {
        return await handleError(new NotFoundError(`Route ${req.method} ${url.pathname} not found`, url.pathname));
      }
      // Route found - process request
      return await processRequest(route.handler);
    } catch (err) {
      return await handleError(err);
    }
  });
}

async function processRequest(handler: RouteHandler): Promise<Response> {
  const { req } = $context();

  // Execute handler
  const data = await handler(req);

  // Create and return response (handles all hooks and serialization)
  return await createResponse(data);
}

async function handleError(err: unknown): Promise<Response> {
  const { app, req } = $context();
  const hooks = getHooks(app);

  // No app-level error hooks - use default error handler
  if (hooks.error.size === 0) {
    const response = await app.errorHandler(err, req, app);
    await runHooks(app, "errorSent", err, req);
    return response;
  }

  // App-level error hook
  let response: Response;
  try {
    // Create error response (handles transform, serialize, send, and sent hooks)
    response = await createResponse(await runHooks.error(app, err, req));
  } catch (e) {
    response = await app.errorHandler(e, req, app);
  }

  // Run errorSent hook after error response is created
  await runHooks(app, "errorSent", err, req);

  return response;
}
