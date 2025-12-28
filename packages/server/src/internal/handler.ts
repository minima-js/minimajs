import { type Instance, type HTTPMethod, HTTPVersion } from "find-my-way";
import { type App, type RouteHandler } from "../interfaces/app.js";
import { runHooks } from "../hooks/manager.js";
import { context, defaultCallbacks, wrap } from "./context.js";
import { NotFoundError } from "../error.js";

async function runCallbacks(callbacks: Set<(...args: any[]) => any>, ...args: any[]) {
  for (const cb of callbacks) {
    await cb(...args);
  }
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
    callbacks: defaultCallbacks(),
    container: app.container,
    req,
    signal: req.signal,
  };

  return wrap(ctx, async () => {
    try {
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
  const { app, callbacks, req } = context();

  // 1. request hook
  await runHooks(app.hooks, "request", req);

  // 2. Execute handler
  const data = await handler(req);
  if (data instanceof Response) {
    await runCallbacks(callbacks.sent);
    return data;
  }

  // 3. transform hook
  const transformed = await runHooks(app.hooks, "transform", data, req);

  // 4. serialize
  const serialized = await app.serialize(transformed, req);

  // 5. send hook
  await runHooks(app.hooks, "send", serialized, req);

  // 6. Create response
  const response = new Response(serialized);

  // 7. sent hook & callbacks
  await runHooks(app.hooks, "sent", req);
  await runCallbacks(callbacks.sent);

  return response;
}

async function handleError(err: unknown): Promise<Response> {
  const { app, callbacks, req } = context();

  await runCallbacks(callbacks.error, err);

  // No app-level error hooks - use default error handler
  if (app.hooks.error.size === 0) {
    const response = await app.errorHandler(err, req, app);
    await runCallbacks(callbacks.sent);
    return response;
  }

  try {
    // App-level error hook
    const errorData = await runHooks(app.hooks, "error", err, req);

    // serialize error
    const serialized = await app.serialize(errorData, req);

    // Create error response
    const response = new Response(serialized);

    // sent hook & callbacks (even on error)
    await runHooks(app.hooks, "sent", req);
    await runCallbacks(callbacks.sent);

    return response;
  } catch (e) {
    const response = await app.errorHandler(e, req, app);
    await runCallbacks(callbacks.sent);
    return response;
  }
}
