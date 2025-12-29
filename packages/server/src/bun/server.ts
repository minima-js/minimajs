import { type Server as BunServer } from "bun";
import Router, { type HTTPVersion } from "find-my-way";
import avvio, { type Avvio } from "avvio";
import type { Logger } from "pino";
import type { App, RouteHandler, RouteOptions } from "../interfaces/app.js";
import type { Plugin, PluginOptions } from "../interfaces/plugin.js";
import { pluginOverride } from "../internal/override.js";
import { kPluginName, kHooks } from "../symbols.js";
import { createHooksStore } from "../hooks/store.js";
import { runHooks } from "../hooks/store.js";
import { serialize, errorHandler } from "../internal/default-handler.js";
import { handleRequest } from "../internal/handler.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";

export interface BunServerOptions {
  prefix?: string;
}

export class Server implements App<BunServer<unknown>> {
  server?: BunServer<unknown>;
  readonly router: Router.Instance<HTTPVersion.V1>;
  readonly container = new Map();
  private prefix: string;
  private avvio: Avvio<App>;

  public log: Logger;

  public serialize: Serializer = serialize;
  public errorHandler: ErrorHandler = errorHandler;

  constructor(logger: Logger, opts: BunServerOptions = {}) {
    this.log = logger;
    this.prefix = opts.prefix || "";
    this.router = Router({ ignoreTrailingSlash: true });

    // Initialize hooks in container
    this.container.set(kHooks, createHooksStore());

    this.avvio = avvio<App>(this, {
      expose: { close: "$close", use: "$use", ready: "$ready", onClose: "$onClose", after: "$after" },
    });
    this.avvio.override = pluginOverride;
  }

  // HTTP methods
  get(path: string, handler: RouteHandler): this {
    return this.route({ method: "GET", path }, handler);
  }

  post(path: string, handler: RouteHandler): this {
    return this.route({ method: "POST", path }, handler);
  }

  put(path: string, handler: RouteHandler): this {
    return this.route({ method: "PUT", path }, handler);
  }

  delete(path: string, handler: RouteHandler): this {
    return this.route({ method: "DELETE", path }, handler);
  }

  patch(path: string, handler: RouteHandler): this {
    return this.route({ method: "PATCH", path }, handler);
  }

  head(path: string, handler: RouteHandler): this {
    return this.route({ method: "HEAD", path }, handler);
  }

  options(path: string, handler: RouteHandler): this {
    return this.route({ method: "OPTIONS", path }, handler);
  }

  all(path: string, handler: RouteHandler): this {
    // Use wildcard '*' for all methods - find-my-way supports this
    return this.route({ method: "*" as any, path }, handler);
  }

  route(options: RouteOptions, handler: RouteHandler): this {
    const { method, path } = options;
    const fullPath = this.prefix + path;
    // find-my-way supports '*' wildcard for all HTTP methods
    this.router.on(
      method,
      fullPath,
      () => {}, // Dummy handler for the router
      { handler, server: this, path: fullPath } // Store our handler and path in the store
    );
    return this;
  }

  // Plugin system
  register<T extends PluginOptions>(plugin: Plugin<T>, opts: T = {} as T): this {
    this.avvio.use(async (instance) => {
      const resolvedName = opts.name ?? plugin[kPluginName] ?? plugin.name;
      const finalOpts = { ...opts, name: resolvedName } as T;
      await runHooks(instance, "register", plugin, finalOpts);
      await plugin(instance, finalOpts);
    });
    return this;
  }

  // Testing utility
  async inject(request: Request | string): Promise<Response> {
    let req: Request;

    if (typeof request === "string") {
      // If it's a string, create a GET request
      const url = request.startsWith("http") ? request : `http://localhost${request.startsWith("/") ? "" : "/"}${request}`;
      req = new Request(url);
    } else {
      req = request;
    }

    // Ensure avvio is ready before handling the request
    await this.avvio.ready();

    return handleRequest(this, this.router, req);
  }

  // Lifecycle
  async ready(): Promise<void> {
    await this.avvio.ready();
  }

  // Server lifecycle
  async listen(opts: { port: number; host?: string }): Promise<string> {
    await this.avvio.ready();

    const app = this;
    const router = this.router;

    function onFetch(req: Request) {
      return handleRequest(app, router, req);
    }

    const host = opts.host || "0.0.0.0";
    const port = opts.port;

    this.server = Bun.serve({
      port,
      hostname: host,
      development: process.env.NODE_ENV !== "production",
      fetch: onFetch,
    });

    // Execute listen hook with address information
    await runHooks(this, "listen", { host, port });

    const addr = `http://${opts.host || "localhost"}:${port}`;
    return addr;
  }

  async close(): Promise<void> {
    console.log("closing the server...", this.avvio.close);
    await new Promise<void>((resolve, reject) =>
      this.avvio.close((err: unknown) => {
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
