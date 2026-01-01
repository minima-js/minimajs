import Router, { type HTTPVersion } from "find-my-way";
import { type Avvio } from "avvio";
import { type Logger, pino } from "pino";
import type { App, RouteHandler } from "./interfaces/app.js";
import type { Plugin, PluginOptions, PluginSync, Register, RegisterOptions } from "./interfaces/plugin.js";
import { createRouteMetadata, applyRoutePrefix } from "./internal/route.js";
import { runHooks } from "./hooks/store.js";
import { serialize, errorHandler } from "./internal/default-handler.js";
import { handleRequest } from "./internal/handler.js";
import type { ErrorHandler, Serializer } from "./interfaces/response.js";
import { plugin as p } from "./internal/plugins.js";
import type { PrefixOptions, RouteFindResult, RouteMetaDescriptor, RouteOptions } from "./interfaces/route.js";
import { createLogger } from "./logger.js";
import { createBoot, wrapPlugin } from "./internal/boot.js";
import type { Address, ServerAdapter, ListenOptions, CreateBaseSeverOptions } from "./interfaces/server.js";
import { minimajs } from "./plugins/minimajs.js";
import { logger } from "./logger.js";

export interface ServerOptions {
  prefix: string;
  logger: Logger;
  router: Router.Instance<HTTPVersion.V1>;
}

export class Server<T = unknown> implements App<T> {
  server?: T;
  readonly router: Router.Instance<HTTPVersion.V1>;
  readonly container = new Map();
  $prefix: string;
  $prefixExclude: string[];
  private boot: Avvio<App>;

  public log: Logger;

  public serialize: Serializer = serialize;
  public errorHandler: ErrorHandler = errorHandler;

  constructor(public readonly adapter: ServerAdapter<T>, opts: ServerOptions) {
    this.log = opts.logger || createLogger({ enabled: false });
    this.$prefix = opts.prefix || "";
    this.$prefixExclude = [];
    this.router = opts.router || Router({ ignoreTrailingSlash: true });
    this.boot = createBoot(this);
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
    // Register route for all HTTP methods
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];
    return this.route({ method: methods as any, path }, ...args);
  }

  route(options: RouteOptions, ...args: [...RouteMetaDescriptor[], RouteHandler]): this {
    const { method, path } = options;
    const handler = args[args.length - 1] as RouteHandler;
    const descriptors = args.slice(0, -1) as RouteMetaDescriptor[];
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
        metadata: createRouteMetadata(descriptors, fullPath, handler, this),
      } satisfies RouteFindResult<T>["store"]
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
    this.boot.use(wrapPlugin(plugin), opts);
    return this;
  }

  // Testing utility
  async inject(request: Request): Promise<Response> {
    await this.ready();
    return handleRequest(this, this.router, request);
  }

  // Lifecycle
  async ready(): Promise<void> {
    await this.boot.ready();
    await runHooks(this, "ready", this);
  }

  // Server lifecycle
  async listen(opts: ListenOptions): Promise<Address> {
    if (!this.adapter) {
      throw new Error("No adapter provided. Please provide an adapter in the constructor.");
    }

    await this.ready();

    const requestHandler = (request: Request) => {
      return handleRequest(this, this.router, request);
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

export function createBaseServer<T>(server: ServerAdapter<T>, options: CreateBaseSeverOptions) {
  const srv = new Server(server, {
    prefix: options.prefix ?? "",
    logger: options.logger === false ? pino({ enabled: false }) : logger,
    router: Router(options.router),
  });
  srv.register(minimajs());
  return srv;
}
