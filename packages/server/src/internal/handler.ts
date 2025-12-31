import { type Instance, type HTTPMethod, type HTTPVersion } from "find-my-way";
import { type App, type RouteHandler } from "../interfaces/app.js";
import { type Route } from "../interfaces/route.js";
import { runHooks, getHooks } from "../hooks/store.js";
import { wrap } from "./context.js";
import { type Context } from "../interfaces/context.js";
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
    request: req,
    signal: req.signal,
    responseState: { headers: new Headers() }, // Initialize mutable response headers
  };

  return wrap(ctx, async () => {
    try {
      {
        // 1. request hook (runs for all requests, even not-found routes)
        const response = await runHooks(app, "request", ctx);
        if (response instanceof Response) {
          return response;
        }
      }
      // Route not found
      if (!route) {
        return await handleError(new NotFoundError(`Route ${req.method} ${url.pathname} not found`), ctx);
      }
      // Route found - process request
      return await processRequest(route.handler, ctx);
    } catch (err) {
      return await handleError(err, ctx);
    }
  });
}

async function processRequest(handler: RouteHandler, ctx: Context): Promise<Response> {
  // Execute handler
  const data = await handler(ctx);

  // Create and return response (handles all hooks and serialization)
  return await createResponse(data);
}

async function handleError(err: unknown, ctx: Context): Promise<Response> {
  const hooks = getHooks(ctx.app);

  // No app-level error hooks - use default error handler
  if (hooks.error.size === 0) {
    const response = await ctx.app.errorHandler(err, ctx);
    await runHooks(ctx.app, "errorSent", ctx);
    return response;
  }

  // App-level error hook
  let response: Response;
  try {
    // Create error response (handles transform, serialize, send, and sent hooks)
    response = await createResponse(await runHooks.error(err, ctx));
  } catch (e) {
    response = await ctx.app.errorHandler(e, ctx);
  }

  // Run errorSent hook after error response is created
  await runHooks(ctx.app, "errorSent", ctx);

  return response;
}
