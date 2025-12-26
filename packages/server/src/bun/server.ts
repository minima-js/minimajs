import { type Server as BunServer } from "bun";
import { default as Router } from "find-my-way";
import avvio, { type Avvio } from "avvio";
import type { Logger } from "pino";
import { Request } from "./request.js";
import { Response } from "./response.js";
import type { App } from "../interfaces/app.js";
import type { RouteHandler } from "../interfaces/route.js";
import { pluginOverride } from "../internal/override.js";

type HookName = "onRequest" | "preSerialization" | "onError" | "onSend" | "onReady" | "onClose";
type HookCallback = (req: Request, res: Response, next?: Next) => void | Promise<void>;
type ReadyHookCallback = () => void | Promise<void>;
type CloseHookCallback = () => void | Promise<void>;
type Next = (error?: unknown, newPayload?: unknown) => void;

interface ContentTypeParser {
  test: (contentType: string) => boolean;
  parser: (req: globalThis.Request, done: (err: Error | null, body?: unknown) => void) => void;
}

export interface BunServerOptions {
  prefix?: string;
}

export class Server implements App {
  private server?: BunServer<unknown>;
  private router: Router.Instance<Router.HTTPVersion.V1>;
  public hooks: Map<HookName, HookCallback[]> = new Map();
  private contentTypeParsers: ContentTypeParser[] = [];
  private errorHandler?: (error: unknown, req: Request, res: Response) => void | Promise<void>;
  private notFoundHandler?: (req: Request, res: Response) => void | Promise<void>;
  private prefix: string;
  readonly container = new Map();

  public log: Logger;

  private avvio: Avvio<App>;

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
      { handler } // Store our handler in the store
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
  addHook(hookName: HookName, callback: HookCallback | ReadyHookCallback | CloseHookCallback): this {
    if (hookName === "onReady") {
      this.avvio.ready(callback as ReadyHookCallback);
      return this;
    }
    if (hookName === "onClose") {
      this.avvio.onClose(callback as CloseHookCallback);
      return this;
    }

    const hooks = this.hooks.get(hookName) || [];
    hooks.push(callback as HookCallback);
    this.hooks.set(hookName, hooks);
    return this;
  }

  private async runHooks(hookName: HookName, req: Request, res: Response, payload?: unknown): Promise<unknown> {
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

  // Error handling
  setErrorHandler(handler: (error: unknown, req: Request, res: Response) => void | Promise<void>): this {
    this.errorHandler = handler;
    return this;
  }

  setNotFoundHandler(handler: (req: Request, res: Response) => void | Promise<void>): this {
    this.notFoundHandler = handler;
    return this;
  }

  private async runErrorHandler(error: unknown, req: Request, res: Response): Promise<void> {
    const errorHooks = this.hooks.get("onError") || [];
    for (const hook of errorHooks) {
      try {
        await hook(req, res, () => {});
      } catch (err) {
        this.log.error(err);
      }
    }

    if (this.errorHandler) {
      await this.errorHandler(error, req, res);
    } else {
      this.log.error(error);
      if (!res.sent) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    }
  }

  // Body parsing
  addContentTypeParser(
    contentType: string,
    parser: (req: globalThis.Request, done: (err: Error | null, body?: unknown) => void) => void
  ): this {
    this.contentTypeParsers.push({
      test: (ct) => ct.includes(contentType),
      parser,
    });
    return this;
  }

  private async parseBody(rawReq: globalThis.Request): Promise<unknown> {
    const contentType = rawReq.headers.get("content-type") || "";

    // Find matching parser
    const customParser = this.contentTypeParsers.find((p) => p.test(contentType));
    if (customParser) {
      return new Promise((resolve, reject) => {
        customParser.parser(rawReq, (err, body) => {
          if (err) return reject(err);
          resolve(body);
        });
      });
    }

    // Default JSON parser
    if (contentType.includes("application/json")) {
      try {
        const text = await rawReq.text();
        return text ? JSON.parse(text) : null;
      } catch (err) {
        throw err;
      }
    }

    return null;
  }

  // Request handling
  private async handleRequest(
    rawReq: globalThis.Request,
    server: ReturnType<typeof Bun.serve>
  ): Promise<globalThis.Response> {
    const req = new Request(rawReq, this as unknown as App, server);
    const res = new Response(this as unknown as App);

    try {
      // Parse query string
      const urlObj = new URL(rawReq.url);
      req.query = Object.fromEntries(urlObj.searchParams.entries());

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

    this.server = Bun.serve({
      port: opts.port,
      hostname: opts.host || "0.0.0.0",
      development: process.env.NODE_ENV !== "production",
      fetch: (req, server) => this.handleRequest(req, server),
    });

    const addr = `http://${opts.host || "localhost"}:${opts.port}`;
    return addr;
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.avvio.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (this.server) {
      // Graceful shutdown
      await this.server.stop();
    }
  }

  // Route printing (for routeLogger plugin)
  printRoutes(opts: { commonPrefix?: boolean } = {}): string {
    return this.router.prettyPrint({ commonPrefix: opts.commonPrefix });
  }
}
