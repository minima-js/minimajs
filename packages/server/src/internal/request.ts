import { Instance, HTTPMethod, HTTPVersion } from "find-my-way";
import { App } from "../interfaces";
import { wrap } from "./context.js";

export async function handleRequest<T>(server: App, router: Instance<HTTPVersion.V1>, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const route = router.find(req.method as HTTPMethod, url.pathname);

  if (!route) {
    return server.errorHandler(req, null);
  }

  const handler = route.store.handler;
  const app = route.store.server as App;
  const res = new Response();
  return await wrap({ app, url, container: app.container, req, res, abortController: {} as any }, async () => {
    try {
      const data = await handler(req, res);
      if (data instanceof Response) return data;
      return new Response(await app.serialize(req, res, data), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    } catch (err) {
      return app.errorHandler(req, err);
    }
  });
}
