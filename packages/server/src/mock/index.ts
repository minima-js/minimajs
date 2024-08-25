import type { InjectOptions, RouteHandlerMethod } from "fastify";
import { createApp, type App } from "../index.js";

export * from "./context.js";
export * from "./request.js";
export * from "./response.js";

type Route = ReturnType<typeof mockRoute>;
type Decorate = (app: App) => unknown;
type InjectResponse = Awaited<ReturnType<App["inject"]>>;

function parseResponse(response: InjectResponse) {
  if (response.headers["content-type"]?.toString().includes("json")) {
    response.body = JSON.parse(response.body);
  }
  return response;
}

export async function mockApp<T extends Route[]>(...routes: T): Promise<InjectResponse[]> {
  const app = createApp({ routes: { log: false } });
  routes.forEach(([opt, callback, decorate]) => {
    const url = (opt.url as string) ?? "/test";
    const method = opt.method ?? "GET";
    opt.url = url;
    opt.method = method;
    decorate?.(app);
    app.route({
      method,
      url,
      handler: callback,
    });
  });
  const output = await Promise.all(routes.map(async ([opt]) => parseResponse(await app.inject(opt))));
  await app.close();
  return output;
}

export function mockRoute(callback: RouteHandlerMethod, option: InjectOptions = {}, decorate?: Decorate) {
  return [option, callback, decorate] as const;
}
