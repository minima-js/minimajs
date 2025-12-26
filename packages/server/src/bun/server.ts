import { type Server as BunServer } from "bun";
import { default as Router } from "find-my-way";
import avvio, { type Avvio } from "avvio";
import type { Logger } from "pino";
import type { App } from "../interfaces/app.js";
import type { RouteHandler } from "../interfaces/route.js";
import { pluginOverride } from "../internal/override.js";
import { type HookCallback, type HookStore, type LifecycleHook } from "../hooks/types.js";
import { add2hooks } from "../hooks/manager.js";
import { wrap } from "../internal/context.js";
import { defaultSerializer } from "../internal/default-handler.js";

type ReadyHookCallback = () => void | Promise<void>;
type CloseHookCallback = () => void | Promise<void>;

export interface BunServerOptions {
  prefix?: string;
}

export class Server implements App {
  private server?: BunServer<unknown>;
  readonly router: Router.Instance<Router.HTTPVersion.V1>;
  public hooks: HookStore = new Map();
  readonly container = new Map();
  private prefix: string;
  private avvio: Avvio<App>;

  public log: Logger;

  public serializer = defaultSerializer;

  constructor(logger: Logger, opts: BunServerOptions = {}) {
    this.log = logger;
    this.prefix = opts.prefix || "";
    this.router = Router({ ignoreTrailingSlash: true });
    this.avvio = avvio<App>(this);
    this.avvio.override = pluginOverride;
  }

  // HTTP methods
  get(path: string, handler: RouteHandler): this {
    return this.route("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): this {
    return this.route("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): this {
    return this.route("PUT", path, handler);
  }

  delete(path: string, handler: RouteHandler): this {
    return this.route("DELETE", path, handler);
  }

  patch(path: string, handler: RouteHandler): this {
    return this.route("PATCH", path, handler);
  }

  head(path: string, handler: RouteHandler): this {
    return this.route("HEAD", path, handler);
  }

  options(path: string, handler: RouteHandler): this {
    return this.route("OPTIONS", path, handler);
  }

  all(path: string, handler: RouteHandler): this {
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
    for (const method of methods) {
      this.route(method, path, handler);
    }
    return this;
  }

  private route(method: string, path: string, handler: RouteHandler): this {
    const fullPath = this.prefix + path;
    // Store the handler in the router's store
    this.router.on(
      method as Router.HTTPMethod,
      fullPath,
      () => {}, // Dummy handler for the router
      { handler, server: this } // Store our handler in the store
    );
    return this;
  }

  // Plugin system
  register(plugin: (app: App, opts: any, done?: (err?: Error) => void) => void | Promise<void>, opts: any = {}): this {
    this.avvio.use((instance, _, done) => {
      const result = plugin(instance as unknown as App, opts, done);
      if (result && typeof result.then === "function") {
        result.then(() => done && done()).catch(done);
      } else if (plugin.length < 3 && done) {
        // If plugin doesn't accept done callback, call it manually
        done();
      }
    });
    return this;
  }

  // Hook management
  addHook(hookName: LifecycleHook, callback: HookCallback | ReadyHookCallback | CloseHookCallback): this {
    if (hookName === "ready") {
      this.avvio.ready(callback as ReadyHookCallback);
      return this;
    }
    if (hookName === "close") {
      this.avvio.onClose(callback as CloseHookCallback);
      return this;
    }
    add2hooks(this.hooks, hookName, callback);
    return this;
  }

  private async runHooks(hookName: LifecycleHook, req: Request, res: Response, payload?: unknown): Promise<unknown> {
    const hooks = this.hooks.get(hookName) || [];
    let currentPayload = payload;

    for (const hook of hooks) {
      if (res.sent) break;

      await new Promise<void>((resolve, reject) => {
        const next = (error?: unknown, newPayload?: unknown) => {
          if (error) return reject(error);
          if (newPayload !== undefined) {
            currentPayload = newPayload;
          }
          resolve();
        };

        const result = hook(req, res, next);
        if (result && typeof result.then === "function") {
          result.then(() => resolve()).catch(reject);
        } else if (hook.length < 3) {
          // If hook doesn't accept next callback, resolve immediately
          resolve();
        }
      });
    }

    return currentPayload;
  }

  // Request handling

  private async handleRequest(
    rawReq: globalThis.Request,
    server: ReturnType<typeof Bun.serve>
  ): Promise<globalThis.Response> {
    try {
      // Parse query string

      // onRequest hooks
      await this.runHooks("onRequest", req, res);
      if (res.sent) return res.toResponse();

      // Parse body
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        req.body = await this.parseBody(rawReq);
      }

      // Find route
      const route = this.router.find(req.method as Router.HTTPMethod, urlObj.pathname);
      if (!route) {
        if (this.notFoundHandler) {
          await this.notFoundHandler(req, res);
        } else {
          res.status(404).send({ error: "Not Found" });
        }
        return res.toResponse();
      }

      // Execute route handler from store
      const handler = route.store?.handler as RouteHandler | undefined;
      if (handler) {
        req.params = route.params || {};
        req.routeOptions = {
          method: req.method,
          path: urlObj.pathname,
          params: Object.keys(route.params || {}),
          prefix: this.prefix,
        };

        const result = await handler(req, res);
        if (!res.sent && result !== undefined) {
          res.send(result);
        }
      }
    } catch (error) {
      await this.runErrorHandler(error, req, res);
    } finally {
      // onSend hooks
      if (!res.sent) {
        try {
          await this.runHooks("onSend", req, res);
        } catch (err) {
          this.log.error(err);
        }
      }
    }

    return res.toResponse();
  }

  // Server lifecycle
  async listen(opts: { port: number; host?: string }): Promise<string> {
    await this.avvio.ready();

    function onFetch(req: Request, server: BunServer<undefined>) {
      return new Response("hey");
    }

    this.server = Bun.serve({
      port: opts.port,
      hostname: opts.host || "0.0.0.0",
      development: process.env.NODE_ENV !== "production",
      fetch: onFetch,
    });

    const addr = `http://${opts.host || "localhost"}:${opts.port}`;
    return addr;
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      this.avvio.close((err) => {
        if (err) reject(err);
        resolve();
      })
    );

    if (this.server) {
      // Graceful shutdown
      await this.server.stop();
    }
  }
}
