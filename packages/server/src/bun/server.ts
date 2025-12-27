import { type Server as BunServer } from "bun";
import { default as Router } from "find-my-way";
import avvio, { type Avvio } from "avvio";
import type { Logger } from "pino";
import type { App } from "../interfaces/app.js";
import type { RouteHandler } from "../interfaces/route.js";
import { pluginOverride } from "../internal/override.js";
import { type HookCallback, type HookStore, type LifecycleHook } from "../hooks/types.js";
import { add2hooks } from "../hooks/manager.js";
import { defaultSerializer, errorHandler } from "../internal/default-handler.js";
import { handleRequest } from "../internal/request.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";

type ReadyHookCallback = () => void | Promise<void>;
type CloseHookCallback = () => void | Promise<void>;

export interface BunServerOptions {
  prefix?: string;
}

export class Server implements App<BunServer<unknown>> {
  server?: BunServer<unknown>;
  readonly router: Router.Instance<Router.HTTPVersion.V1>;
  public hooks: HookStore = new Map();
  readonly container = new Map();
  private prefix: string;
  private avvio: Avvio<App>;

  public log: Logger;

  public serialize: Serializer = defaultSerializer;
  public errorHandler: ErrorHandler = errorHandler;

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

  // Server lifecycle
  async listen(opts: { port: number; host?: string }): Promise<string> {
    await this.avvio.ready();

    const app = this;
    const router = this.router;

    function onFetch(req: Request) {
      return handleRequest(app, router, req);
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
