import { type Request, type Response, type Plugin } from "./types.js";
import { createPlugin } from "./internal/plugins.js";
import { invokeHandler, type Interceptor } from "./interceptor.js";

interface RegisterMiddleware {
  filter?(req: Request): boolean | Promise<boolean>;
}

/**
 * Creates a plugin that registers one or more interceptors as global middleware.
 * Interceptors are executed before route handlers as preHandler hooks.
 */
export function middleware(...interceptors: Interceptor[]): Plugin<RegisterMiddleware> {
  return createPlugin<RegisterMiddleware>(async function middleware(app, { filter }) {
    for (const interceptor of interceptors) {
      async function handler(req: Request, res: Response) {
        if (filter && !(await filter(req))) return;
        return invokeHandler(interceptor, app, req, res);
      }
      app.addHook("preHandler", handler);
    }
  });
}
