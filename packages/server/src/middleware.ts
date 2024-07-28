import { type Request, type Response, type App, type Plugin } from "./types.js";
import { setPluginOption } from "./internal/plugins.js";
import type { Interceptor } from "./module.js";
import { isAsyncFunction } from "util/types";

interface RegisterMiddleware {
  filter(req: Request): boolean | Promise<boolean>;
}

export function middleware(...interceptors: Interceptor[]): Plugin<RegisterMiddleware> {
  async function middlewarePlugin(app: App, { filter }: RegisterMiddleware) {
    for (const interceptor of interceptors) {
      async function handler(req: Request, res: Response) {
        if (filter && !(await filter(req))) return;
        return invokeHandler(interceptor, app, req, res);
      }
      app.addHook("preHandler", handler);
    }
  }
  setPluginOption(middlewarePlugin, { override: true });
  return middlewarePlugin;
}

function invokeHandler(handler: Function, app: App, req: Request, res: Response) {
  if (isAsyncFunction(handler)) {
    return handler.call(app, req, res);
  }
  return new Promise((resolve) => {
    handler.call(app, req, res, resolve);
  });
}
