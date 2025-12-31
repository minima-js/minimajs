import { type Server as BunServer } from "bun";
import Router, { type HTTPVersion } from "find-my-way";
import avvio, { type Avvio } from "avvio";
import type { Logger } from "pino";
import type { App, RouteHandler, RouteOptions, RouteMetaDescriptor, PrefixOptions } from "../interfaces/app.js";
import type { Plugin, PluginOptions, PluginSync, Register, RegisterOptions } from "../interfaces/plugin.js";
import { pluginOverride } from "../internal/override.js";
import { createRouteMetadata, applyRoutePrefix } from "../internal/route.js";
import { kHooks } from "../symbols.js";
import { createHooksStore } from "../hooks/store.js";
import { runHooks } from "../hooks/store.js";
import { serialize, errorHandler } from "../internal/default-handler.js";
import { handleRequest } from "../internal/handler.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";
import { plugin as p } from "../internal/plugins.js";
import type { RouteFindResult } from "../interfaces/route.js";

export interface BunServerOptions {
  prefix?: string;
}

export class Server<T> implements App<BunServer<T>> {
  server?: BunServer<T>;
  readonly router: Router.Instance<HTTPVersion.V1>;
  readonly container = new Map();
  $prefix: string;
  $prefixExclude: string[];
  private avvio: Avvio<App>;

  public log: Logger;

  public serialize: Serializer = serialize;
  public errorHandler: ErrorHandler = errorHandler;

  constructor(logger: Logger, opts: BunServerOptions = {}) {
    this.log = logger;
    this.$prefix = opts.prefix || "";
    this.$prefixExclude = [];
    this.router = Router({ ignoreTrailingSlash: true });

    // Initialize hooks in container
    this.container.set(kHooks, createHooksStore());

    this.avvio = avvio<App>(this, {
      expose: { close: "$close", ready: "$ready" },
    });
    this.avvio.override = pluginOverride;
  }

  // HTTP methods
  get(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    return this.route({ method: "GET", path }, ...args);
  }

  post(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    return this.route({ method: "POST", path }, ...args);
  }

  put(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    return this.route({ method: "PUT", path }, ...args);
  }

  delete(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    return this.route({ method: "DELETE", path }, ...args);
  }

  patch(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    return this.route({ method: "PATCH", path }, ...args);
  }

  head(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    return this.route({ method: "HEAD", path }, ...args);
  }

  options(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    return this.route({ method: "OPTIONS", path }, ...args);
  }

  all(path: string, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    // Use wildcard '*' for all methods - find-my-way supports this
    return this.route({ method: "*" as any, path }, ...args);
  }

  route(options: RouteOptions, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    const { method, path } = options;
    const handler = args[args.length - 1] as RouteHandler;
    const metadata = args.slice(0, -1) as RouteMetaDescriptor[];

    const fullPath = applyRoutePrefix(path, this.$prefix, this.$prefixExclude);

    // find-my-way supports '*' wildcard for all HTTP methods
    this.router.on(
      method,
      fullPath,
      () => {}, // Dummy handler - actual handler is in store
      {
        server: this,
        path: fullPath,
        methods: Array.isArray(method) ? method : [method],
        handler,
        metadata: createRouteMetadata(metadata, this),
      } satisfies RouteFindResult<BunServer<T>>["store"]
    );
    return this;
  }

  prefix(prefix: string, options: PrefixOptions = {}): this {
    this.$prefix = prefix;
    if (options.exclude) {
      this.$prefixExclude = options.exclude;
    }
    return this;
  }

  // Plugin system - overloaded implementations
  register<T>(plugin: Plugin<PluginOptions<T>>, opts?: T): this;
  register<T>(plugin: PluginSync<T>, opts?: any): this;
  register<T>(plugin: Register<RegisterOptions<T>>, opts?: T): this;
  register(plugin: Plugin | PluginSync | Register, opts?: any): this {
    if (p.isSync(plugin)) {
      plugin(this, opts);
      return this;
    }
    this.avvio.use(async (instance, opts) => {
      const pluginName = p.getName(plugin, opts);
      const finalOpts = opts ? { ...opts, name: pluginName } : { name: pluginName };
      await runHooks(instance, "register", plugin, finalOpts);
      await plugin(instance, finalOpts);
    }, opts);
    return this;
  }

  // Testing utility
  async inject(request: Request | string): Promise<Response> {
    let req: Request;

    if (typeof request === "string") {
      // If it's a string, create a GET request
      const url = request.startsWith("http")
        ? request
        : `http://localhost${request.startsWith("/") ? "" : "/"}${request}`;
      req = new Request(url);
    } else {
      req = request;
    }

    // Ensure avvio is ready before handling the request
    await this.ready();
    return handleRequest(this, this.router, req);
  }

  // Lifecycle
  async ready(): Promise<void> {
    await this.avvio.ready();
    await runHooks(this, "ready", this);
  }

  // Server lifecycle
  async listen(opts: { port: number; host?: string }): Promise<string> {
    await this.ready();
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
    // 1. Stop accepting new connections immediately
    if (this.server) {
      await this.server.stop();
    }
    // 2. Run user cleanup hooks (database connections, file handles, etc.)
    await runHooks(this, "close");
    // 3. Tear down plugin lifecycle (avvio close handlers)
    await new Promise<void>((resolve, reject) =>
      this.avvio.close((err: unknown) => {
        if (err) reject(err);
        resolve();
      })
    );
  }
}
