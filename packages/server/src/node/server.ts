import { type Server as NodeServer, type IncomingMessage, type ServerResponse, createServer } from "node:http";
import Router, { type HTTPVersion } from "find-my-way";
import { type Avvio } from "avvio";
import type { Logger } from "pino";
import type {
  App,
  RouteHandler,
  RouteOptions,
  RouteMetaDescriptor,
  PrefixOptions,
  Address,
} from "../interfaces/app.js";
import type { Plugin, PluginOptions, PluginSync, Register, RegisterOptions } from "../interfaces/plugin.js";
import { createRouteMetadata, applyRoutePrefix } from "../internal/route.js";
import { runHooks } from "../hooks/store.js";
import { serialize, errorHandler } from "../internal/default-handler.js";
import { handleRequest } from "../internal/handler.js";
import type { ErrorHandler, Serializer } from "../interfaces/response.js";
import { plugin as p } from "../internal/plugins.js";
import type { RouteFindResult } from "../interfaces/route.js";
import { toWebRequest, fromWebResponse } from "./utils.js";
import { createLogger } from "../logger.js";
import { createBoot, wrapPlugin } from "../internal/boot.js";
import type { AddressInfo } from "node:net";

export interface NodeServerOptions {
  prefix?: string;
  logger?: Logger;
  router?: Router.Instance<HTTPVersion.V1>;
}

export class Server implements App<NodeServer> {
  server?: NodeServer;
  readonly router: Router.Instance<HTTPVersion.V1>;
  readonly container = new Map();
  $prefix: string;
  $prefixExclude: string[];
  private boot: Avvio<App>;

  public log: Logger;

  public serialize: Serializer = serialize;
  public errorHandler: ErrorHandler = errorHandler;

  constructor(opts: NodeServerOptions = {}) {
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
      } satisfies RouteFindResult<NodeServer>["store"]
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
  async listen(opts: { port: number; host?: string }): Promise<Address> {
    await this.ready();
    const app = this;
    const router = this.router;

    async function onRequest(req: IncomingMessage, res: ServerResponse) {
      const request = toWebRequest(req);
      const response = await handleRequest(app, router, request);
      await fromWebResponse(response, res);
    }

    const hostname = opts.host || "0.0.0.0";
    const port = opts.port;
    const server = createServer(onRequest);

    this.server = server;

    await new Promise<void>((resolve) => {
      this.server!.listen(port, hostname, () => {
        resolve();
      });
    });

    const addr = server.address() as AddressInfo;

    const address: Address = {
      hostname,
      port: addr.port,
      family: addr.family,
      protocol: "http",
      address: `http://${hostname}:${addr.port}`,
    };

    // Execute listen hook with address information
    // TODO: decide weather to pass entire server or not
    await runHooks(this, "listen", server);

    return address;
  }

  async close(): Promise<void> {
    // 1. Stop accepting new connections immediately
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
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
