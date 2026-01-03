import { type Instance, type HTTPMethod, type HTTPVersion } from "find-my-way";
import { type App } from "../interfaces/app.js";
import { type Route } from "../interfaces/route.js";
import { runHooks, getHooks } from "../hooks/store.js";
import { wrap } from "./context.js";
import { type Context } from "../interfaces/context.js";
import { NotFoundError } from "../error.js";
import { createResponse } from "./response.js";
import { result2route } from "./route.js";
import type { RouteFindResult } from "../interfaces/route.js";

export async function handleRequest(server: App, router: Instance<HTTPVersion.V1>, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const result: RouteFindResult<any> | null = router.find(req.method as HTTPMethod, url.pathname);
  let route: Route | null = null;
  let app = server;

  const locals = new Map<symbol, unknown>();

  if (result) {
    route = result2route(result);
    app = result.store.app;
  }

  const ctx: Context = {
    app,
    server: server.server!,
    url,
    route,
    locals,
    container: app.container,
    request: req,
    signal: req.signal,
    responseState: { headers: new Headers() }, // Initialize mutable response headers
    incomingMessage: undefined as any,
    serverResponse: undefined as any,
  };

  return wrap(ctx, async () => {
    try {
      {
        // 1. request hook (runs for all requests, even not-found routes)
        const response = await runHooks.request(app, ctx);
        if (response instanceof Response) {
          return response;
        }
      }
      // Route not found
      if (!route) {
        return await handleError(new NotFoundError(), ctx);
      }
      const data = await route.handler(ctx);
      // Create and return response (handles all hooks and serialization)
      return await createResponse(data, {}, ctx);
      // Route found - process request
    } catch (err) {
      return await handleError(err, ctx);
    }
  });
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
    response = await createResponse(await runHooks.error(ctx.app, err, ctx), {}, ctx);
  } catch (e) {
    response = await ctx.app.errorHandler(e, ctx);
  }

  // Run errorSent hook after error response is created
  await runHooks(ctx.app, "errorSent", ctx);

  return response;
}
