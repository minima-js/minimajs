import { type Instance, type HTTPMethod, HTTPVersion } from "find-my-way";
import { type App } from "../interfaces/app.js";
import { type ResponseBody } from "../interfaces/response.js";
import { runHooks } from "../hooks/manager.js";
import { wrap } from "./context.js";

function createResponse(body: ResponseBody, res: Response): Response {
  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  });
}

export async function handleRequest<T>(
  server: App<T>,
  router: Instance<HTTPVersion.V1>,
  req: Request
): Promise<Response> {
  const url = new URL(req.url);
  const route = router.find(req.method as HTTPMethod, url.pathname);
  const res = new Response(undefined, { status: 200 });

  // Route not found
  if (!route) {
    return wrap({ app: server, url, container: server.container, req, res, abortController: {} as any }, async () => {
      await runHooks(server.hooks, "notFound", req);
      return server.errorHandler(null, req);
    });
  }

  // Route found - process request
  const handler = route.store.handler;
  const app = route.store.server as App;

  return wrap({ app, url, container: app.container, req, res, abortController: {} as any }, async () => {
    try {
      return await processRequest(app, handler, req, res);
    } catch (err) {
      return await handleError(app, err, req, res);
    }
  });
}

async function processRequest(app: App, handler: any, req: Request, res: Response): Promise<Response> {
  // 1. preHandler hook
  await runHooks(app.hooks, "preHandler", req, res);

  // 2. Execute handler
  const data = await handler(req, res);
  if (data instanceof Response) return data;

  // 3. transform hook
  const transformed = await runHooks(app.hooks, "transform", data, req, res);

  // 4. serialize
  const serialized = await app.serialize(transformed, req, res);

  // 5. send hook
  await runHooks(app.hooks, "send", serialized, req, res);

  // 6. Create response
  const response = createResponse(serialized, res);

  // 7. sent hook
  await runHooks(app.hooks, "sent", req, res);

  return response;
}

async function handleError(app: App, err: unknown, req: Request, res: Response): Promise<Response> {
  if (app.hooks.get("error")?.size ?? 0 === 0) {
    return app.errorHandler(err, req);
  }

  try {
    // error hook
    const errorData = await runHooks(app.hooks, "error", err, req, res);

    // serialize error
    const serialized = await app.serialize(errorData, req, res);

    // Create error response
    const response = createResponse(serialized, res);

    // sent hook (even on error)
    await runHooks(app.hooks, "sent", req, res);

    return response;
  } catch (e) {
    // Final fallback
    return app.errorHandler(e, req);
  }
}
