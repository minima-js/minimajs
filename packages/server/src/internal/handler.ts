import { type HTTPMethod } from "find-my-way";
import { type App } from "../interfaces/app.js";
import { type Route } from "../interfaces/route.js";
import { runHooks, getHooks } from "../hooks/store.js";
import { wrap } from "./context.js";
import { type Context, type RequestHandlerContext } from "../interfaces/context.js";
import { NotFoundError, RedirectError } from "../error.js";
import { createResponse } from "./response.js";
import { result2route } from "./route.js";
import type { RouteFindResult } from "../interfaces/route.js";
import { parseRequestURL } from "../utils/request.js";

async function finalizeSent(ctx: Context, response: Response) {
  await runHooks.safe(ctx.app, "sent", ctx);
  return response;
}

async function finalizeErrorSent(ctx: Context, response: Response, error: unknown) {
  await runHooks.safe(ctx.app, "errorSent", error, ctx);
  return response;
}

export function getPathname(url: string): string {
  let i = 8; // after "https://"
  if (url.charCodeAt(4) !== 115) i = 7; // "http://"

  // find first /
  for (; url.charCodeAt(i) !== 47; i++);

  const q = url.indexOf("?", i);
  return q === -1 ? url.slice(i) : url.slice(i, q);
}

export async function handleRequest<S>(server: App<S>, req: Request, partial: RequestHandlerContext<S>): Promise<Response> {
  const { url, pathname } = parseRequestURL(req);
  const result: RouteFindResult<any> | null = server.router.find(req.method as HTTPMethod, url);
  let route: Route | null = null;
  let app = server;

  if (result) {
    route = result2route(result);
    app = result.store.app;
  }

  const ctx: Context<any> = {
    app,
    pathname,
    url,
    server: server.server!,
    route,
    locals: {},
    container: app.container,
    request: req,
    responseState: { headers: new Headers() }, // Initialize mutable response headers
    incomingMessage: partial.incomingMessage,
    serverResponse: partial.serverResponse,
  };

  return wrap(ctx, async () => {
    try {
      return await finalizeSent(ctx, await prepare(route, ctx));
    } catch (err) {
      return await handleError(err, ctx);
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
  if (err instanceof RedirectError) return err.render(ctx);
  const hooks = getHooks(ctx.app);

  // No app-level error hooks - use default error handler
  if (hooks.error.size === 0) {
    return finalizeErrorSent(ctx, await ctx.app.errorHandler(err, ctx), err);
  }
  // App-level error hook
  try {
    // Create error response (handles transform, serialize, send, and sent hooks)
    const response = await createResponse(await runHooks.error(ctx.app, err, ctx), {}, ctx);
    return finalizeSent(ctx, response);
  } catch (e) {
    return finalizeErrorSent(ctx, await ctx.app.errorHandler(e, ctx), e);
  }
}
