import Router, { type HTTPVersion } from "find-my-way";
import { type Avvio } from "avvio";
import { type Logger } from "pino";
import type { App, RouteHandler } from "../interfaces/app.js";
import type { Plugin, Registerable, PluginOptions, PluginSync, Register, RegisterOptions } from "../interfaces/plugin.js";
import { applyRouteMetadata, applyRoutePrefix } from "../internal/route.js";
import { createHooksStore, runHooks } from "../hooks/store.js";
import { serialize, errorHandler } from "../internal/default-handler.js";
import { handleRequest } from "../internal/handler.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";
import { plugin as p } from "../internal/plugins.js";
import type { PrefixOptions, RouteConfig, RouteMetaDescriptor, RouteOptions } from "../interfaces/route.js";
import { createBoot, wrapPlugin } from "../internal/boot.js";
import type { AddressInfo, ServerAdapter, ListenOptions } from "../interfaces/server.js";
import { kAppDescriptor, kHooks, kModulesChain } from "../symbols.js";
import type { PartialContext } from "../interfaces/index.js";

export interface ServerOptions {
  prefix: string;
  logger: Logger;
  router: Router.Instance<HTTPVersion.V1>;
}

export class Server<T = any> implements App<T> {
  server?: T;
  readonly router: Router.Instance<HTTPVersion.V1>;
  readonly container: Record<symbol, unknown>;

  $prefix: string;
  $prefixExclude: string[];

  $parent: App<T> | null = null;

  $root: App<T> = this;

  private boot: Avvio<App>;

  public log: Logger;

  public serialize: Serializer<T> = serialize;
  public errorHandler: ErrorHandler<T> = errorHandler;

  constructor(
    public readonly adapter: ServerAdapter<T>,
    opts: ServerOptions
  ) {
    this.container = {
      [kHooks]: createHooksStore(),
      [kAppDescriptor]: [],
      [kModulesChain]: [this],
    };
    this.log = opts.logger;
    this.$prefix = opts.prefix;
    this.$prefixExclude = [];
    this.router = opts.router;
    this.boot = createBoot(this);
  }

  // HTTP methods
  get(path: string, handler: RouteHandler<T>): this;
  get(path: string, ...args: [...descriptors: RouteMetaDescriptor<T>[], handler: RouteHandler<T>]): this;
  get(path: string, ...args: [...descriptors: RouteMetaDescriptor<T>[], handler: RouteHandler<T>]): this {
    return this.route({ method: "GET", path }, ...args);
  }

  post(path: string, handler: RouteHandler<T>): this;
  post(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  post(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    return this.route({ method: "POST", path }, ...args);
  }

  put(path: string, handler: RouteHandler<T>): this;
  put(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  put(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    return this.route({ method: "PUT", path }, ...args);
  }

  delete(path: string, handler: RouteHandler<T>): this;
  delete(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  delete(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    return this.route({ method: "DELETE", path }, ...args);
  }

  patch(path: string, handler: RouteHandler<T>): this;
  patch(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  patch(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    return this.route({ method: "PATCH", path }, ...args);
  }

  head(path: string, handler: RouteHandler<T>): this;
  head(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  head(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    return this.route({ method: "HEAD", path }, ...args);
  }

  options(path: string, handler: RouteHandler<T>): this;
  options(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  options(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    return this.route({ method: "OPTIONS", path }, ...args);
  }

  all(path: string, handler: RouteHandler<T>): this;
  all(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  all(path: string, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    // Register route for all HTTP methods
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
    return this.route({ method: methods as any, path }, ...args);
  }

  route(options: RouteOptions, handler: RouteHandler<T>): this;
  route(options: RouteOptions, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this;
  route(options: RouteOptions, ...args: [...RouteMetaDescriptor<T>[], RouteHandler<T>]): this {
    const { method, path } = options;
    const handler = args[args.length - 1] as RouteHandler<T>;
    const descriptors = args.slice(0, -1) as RouteMetaDescriptor<T>[];
    const fullPath = applyRoutePrefix(path, this.$prefix, this.$prefixExclude);

    const store: RouteConfig<T> = {
      app: this,
      path: fullPath,
      methods: Array.isArray(method) ? method : [method],
      handler,
      metadata: {},
    };
    applyRouteMetadata(store, descriptors);
    this.router.on(
      method,
      fullPath,
      () => {}, // Dummy handler - actual handler is in store
      store
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
  register(plugin: Registerable, opts?: any): this {
    if (p.isSync(plugin)) {
      plugin(this, opts);
      return this;
    }
    this.boot.use(wrapPlugin(plugin), opts);
    return this;
  }

  // Testing utility
  async handle(request: Request, ctx: PartialContext<T> = {}): Promise<Response> {
    await this.ready();
    return handleRequest(this, request, ctx as PartialContext);
  }

  // Lifecycle
  async ready(): Promise<void> {
    await this.boot.ready();
    await runHooks(this, "ready", this);
  }

  // Server lifecycle
  async listen(opts: ListenOptions): Promise<AddressInfo> {
    if (!this.adapter) {
      throw new Error("No adapter provided. Please provide an adapter in the constructor.");
    }

    await this.ready();

    const requestHandler = (request: Request, ctx: PartialContext<T> = {}) => {
      return handleRequest(this, request, ctx as PartialContext);
    };

    const { server, address } = await this.adapter.listen(opts, requestHandler);
    this.server = server;

    // Execute listen hook with address information
    await runHooks(this, "listen", server);

    return address;
  }

  async close(): Promise<void> {
    // 1. Stop accepting new connections immediately
    if (this.server && this.adapter) {
      await this.adapter.close(this.server);
    }
    // 2. Run user cleanup hooks (database connections, file handles, etc.)
    await runHooks(this, "close");
    // 3. Tear down plugin lifecycle (avvio close handlers)
    await new Promise<void>((resolve, reject) =>
      this.boot.close((err: unknown) => {
        if (err) reject(err);
        resolve();
      })
    );
  }
}
