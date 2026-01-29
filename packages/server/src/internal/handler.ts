import { type HTTPMethod } from "find-my-way";
import { type App } from "../interfaces/app.js";
import { type Route } from "../interfaces/route.js";
import { runHooks } from "../hooks/store.js";
import { type Context, type RequestHandlerContext } from "../interfaces/context.js";
import { NotFoundError } from "../error.js";
import { createResponse } from "./response.js";
import { result2route } from "./route.js";
import type { RouteFindResult } from "../interfaces/route.js";
import { parseRequestURL } from "../utils/request.js";
import type { Server } from "../core/index.js";

export async function handleRequest<S>(
  server: Server<S>,
  req: Request,
  partial: RequestHandlerContext<S>
): Promise<Response> {
  const { pathEnd, pathStart } = parseRequestURL(req);
  const pathname = req.url.slice(pathStart, pathEnd);
  const result: RouteFindResult<any> | null = server.router.find(req.method as HTTPMethod, pathname);
  let route: Route<S> | null = null;
  let app: App<S> = server;

  if (result) {
    route = result2route(result);
    app = result.store.app;
  }

  const ctx: Context<any> = {
    $metadata: {
      pathStart,
      pathEnd,
    },
    app,
    pathname,
    server: server.server!,
    serverAdapter: server.adapter,
    route,
    locals: {},
    container: app.container,
    request: req,
    responseState: { headers: new Headers() }, // Initialize mutable response headers
    incomingMessage: partial.incomingMessage,
    serverResponse: partial.serverResponse,
  };

  return server.container.$rootMiddleware(ctx, async () => {
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
  });
}
