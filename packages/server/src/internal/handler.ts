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
    responseState: { headers: new Headers() }, // Initialize mutable response headers
    incomingMessage: undefined as any,
    serverResponse: undefined as any,
  };

  return wrap(ctx, async () => {
    try {
      const response = await prepare(route, ctx);
      await runHooks.safe(ctx.app, "sent", ctx);
      return response;
      // Route found - process request
    } catch (err) {
      const response = await handleError(err, ctx);
      await runHooks.safe(ctx.app, "errorSent");
      return response;
    }
  });
}

async function prepare(route: Route | null, ctx: Context): Promise<Response> {
  {
    // 1. request hook (runs for all requests, even not-found routes)
    const response = await runHooks.request(ctx.app, ctx);
    if (response instanceof Response) {
      return response;
    }
  }
  // 2. Route not found
  if (!route) {
    throw new NotFoundError();
  }
  // 3. Create and return response (handles all hooks and serialization)
  return createResponse(await route.handler(ctx), {}, ctx);
}

async function handleError(err: unknown, ctx: Context): Promise<Response> {
  const hooks = getHooks(ctx.app);
  // No app-level error hooks - use default error handler
  if (hooks.error.size === 0) {
    return ctx.app.errorHandler(err, ctx);
  }

  // App-level error hook
  try {
    // Create error response (handles transform, serialize, send, and sent hooks)
    return await createResponse(await runHooks.error(ctx.app, err, ctx), {}, ctx);
  } catch (e) {
    return ctx.app.errorHandler(e, ctx);
  }
}
