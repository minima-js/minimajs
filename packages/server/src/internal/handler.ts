import { type Instance, type HTTPMethod, HTTPVersion } from "find-my-way";
import { type App, type RouteHandler } from "../interfaces/app.js";
import { runHooks } from "../hooks/manager.js";
import { context, wrap } from "./context.js";
import { NotFoundError } from "../error.js";
import type { CreateResponseOptions } from "../interfaces/response.js";

/**
 * Merges headers from context with provided headers
 * Context headers take precedence (override)
 */
function mergeHeaders(base: Headers, ctx: Headers): Headers {
  const finalHeaders = new Headers(base);
  for (const [key, value] of ctx.entries()) {
    finalHeaders.set(key, value);
  }
  return finalHeaders;
}

export async function createResponse(data: unknown, options: CreateResponseOptions = {}): Promise<Response> {
  const { app, req, response: ctxResponse } = context();
  const { status = 200, headers } = options;

  // If data is already a Response, return as-is (no header merging)
  if (data instanceof Response) {
    await runHooks(app.hooks, "sent", req);
    return data;
  }

  // 1. transform hook
  const transformed = await runHooks(app.hooks, "transform", data, req);

  // 2. serialize
  const body = await app.serialize(transformed, req);

  // 3. send hook - plugins write to ctxResponse.headers
  await runHooks(app.hooks, "send", body, req);

  // 4. Merge option headers with context headers (context takes precedence)
  const finalHeaders = mergeHeaders(new Headers(headers), ctxResponse.headers);

  // 5. Create response with merged headers
  const response = new Response(body, {
    status: ctxResponse.status ?? status,
    headers: finalHeaders,
  });

  // 6. sent hook
  await runHooks(app.hooks, "sent", req);

  return response;
}

export async function handleRequest<T>(
  server: App<T>,
  router: Instance<HTTPVersion.V1>,
  req: Request
): Promise<Response> {
  const url = new URL(req.url);
  const route = router.find(req.method as HTTPMethod, url.pathname);
  const locals = new Map<symbol, unknown>();

  const app: App = route ? route.store.server : server;

  const ctx = {
    app,
    url,
    route,
    locals,
    container: app.container,
    req,
    signal: req.signal,
    response: { headers: new Headers() }, // Initialize mutable response headers
  };

  return wrap(ctx, async () => {
    try {
      // 1. request hook (runs for all requests, even not-found routes)
      const requestResult = await runHooks(app.hooks, "request", req);

      // If request hook returned a Response, run through send hook and skip route handling
      if (requestResult instanceof Response) {
        return await createResponse(requestResult);
      }

      // Route not found
      if (!route) {
        return await handleError(new NotFoundError(`Route ${req.method} ${url.pathname} not found`, url.pathname));
      }

      // Route found - process request
      return await processRequest(route.store.handler);
    } catch (err) {
      return await handleError(err);
    }
  });
}

async function processRequest(handler: RouteHandler): Promise<Response> {
  const { req } = context();

  // Execute handler
  const data = await handler(req);

  // Create and return response (handles all hooks and serialization)
  return await createResponse(data);
}

async function handleError(err: unknown): Promise<Response> {
  const { app, req } = context();

  let response: Response;

  // No app-level error hooks - use default error handler
  if (app.hooks.error.size === 0) {
    response = await app.errorHandler(err, req, app);
  } else {
    try {
      // App-level error hook
      const errorData = await runHooks(app.hooks, "error", err, req);

      // Create error response (handles transform, serialize, send, and sent hooks)
      response = await createResponse(errorData);
    } catch (e) {
      response = await app.errorHandler(e, req, app);
    }
  }

  // Run errorSent hook after error response is created
  await runHooks(app.hooks, "errorSent", err, req);

  return response;
}
