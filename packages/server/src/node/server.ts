import { createServer, type Server as HttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { isAsyncFunction } from "node:util/types";
import { default as Router } from "find-my-way";
import avvio, { type Avvio } from "avvio";
import type { Logger } from "pino";
import { Request } from "./request.js";
import { Response } from "./response.js";
import type { App } from "../interfaces/app.js";
import type { RouteHandler } from "../interfaces/route.js";

type HookName = "onRequest" | "preSerialization" | "onError" | "onSend" | "onReady" | "onClose";
type HookCallback = (req: Request, res: Response, next?: Next) => void | Promise<void>;
type ReadyHookCallback = () => void | Promise<void>;
type CloseHookCallback = () => void | Promise<void>;

interface ContentTypeParser {
  test: (contentType: string) => boolean;
  parser: (req: IncomingMessage, done: (err: Error | null, body?: unknown) => void) => void;
}

export class MinimalServer implements App {
  private Request: new () => Request;
  private server: HttpServer;
  private router: Router.Instance<Router.HTTPVersion.V1>;
  private hooks: Map<HookName, HookCallback[]> = new Map();
  private contentTypeParsers: ContentTypeParser[] = [];
  private errorHandler?: (error: unknown, req: Request, res: Response) => void | Promise<void>;
  private notFoundHandler?: (req: Request, res: Response) => void | Promise<void>;

  public log: Logger;

  private avvio: Avvio<App>;

  constructor(logger: Logger) {
    this.log = logger;
    this.server = createServer(this.handleRequest.bind(this));
    this.router = Router({ ignoreTrailingSlash: true });
    this.avvio = avvio<App>(this);
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
    this.router.on(method, path, async (req: Request, res: Response, params: Record<string, string>) => {
      req.params = params;
      req.routeOptions = {
        method,
        url: path,
        path,
        params: Object.keys(params),
      };

      try {
        const result = await handler(req, res);
        if (!res.sent && result !== undefined) {
          res.send(result);
        }
      } catch (error) {
        await this.runErrorHandler(error, req, res);
      }
    });
    return this;
  }

  // Plugin system
  register(plugin: (app: App, opts: any, done?: (err?: Error) => void) => void | Promise<void>, opts: any = {}): this {
    this.avvio.use((instance, _, done) => {
      if (isAsyncFunction(plugin)) {
        plugin(instance as unknown as App, opts)
          .then(() => done && done())
          .catch(done);
      } else {
        plugin(instance as unknown as App, opts, done);
        // If plugin doesn't accept done callback, call it manually
        if (plugin.length < 3 && done) {
          done();
        }
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

        if (isAsyncFunction(hook)) {
          hook(req, res, next)
            .then(() => resolve())
            .catch(reject);
        } else {
          hook(req, res, next);
          // If hook doesn't accept next callback, resolve immediately
          if (hook.length < 3) {
            resolve();
          }
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
    parser: (req: IncomingMessage, payload: unknown, done: (err: Error | null, body?: unknown) => void) => void
  ): this {
    this.contentTypeParsers.push({
      test: (ct) => ct.includes(contentType),
      parser,
    });
    return this;
  }

  private async parseBody(rawReq: IncomingMessage): Promise<unknown> {
    const contentType = rawReq.headers["content-type"] || "";

    // Find matching parser
    const customParser = this.contentTypeParsers.find((p) => p.test(contentType));
    if (customParser) {
      return new Promise((resolve, reject) => {
        customParser.parser(rawReq, null, (err, body) => {
          if (err) return reject(err);
          resolve(body);
        });
      });
    }

    // Default JSON parser
    if (contentType.includes("application/json")) {
      return new Promise((resolve, reject) => {
        let data = "";
        rawReq.on("data", (chunk) => (data += chunk));
        rawReq.on("end", () => {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch (err) {
            reject(err);
          }
        });
        rawReq.on("error", reject);
      });
    }

    return null;
  }

  // Request handling
  private async handleRequest(rawReq: IncomingMessage, rawRes: ServerResponse): Promise<void> {
    const req = new Request(rawReq, this as unknown as App, rawReq.socket);
    const res = new Response(rawRes, this as unknown as App);

    try {
      // Parse query string
      const urlObj = new URL(req.url, `http://${req.hostname}`);
      req.query = Object.fromEntries(urlObj.searchParams.entries());

      // onRequest hooks
      await this.runHooks("onRequest", req, res);
      if (res.sent) return;

      // Parse body
      if (["POST", "PUT", "PATCH"].includes(req.method)) {
        req.body = await this.parseBody(rawReq);
      }

      // Find route
      const route = this.router.find(req.method, urlObj.pathname);
      if (!route) {
        if (this.notFoundHandler) {
          await this.notFoundHandler(req, res);
        } else {
          res.status(404).send({ error: "Not Found" });
        }
        return;
      }

      // Execute route handler
      await route.handler(req, res, route.params);
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
  }

  // Server lifecycle
  async listen(opts: { port: number; host?: string }): Promise<string> {
    await this.avvio.ready();

    return new Promise((resolve, reject) => {
      this.server.listen(opts.port, opts.host || "0.0.0.0", () => {
        const addr = `http://${opts.host || "localhost"}:${opts.port}`;
        resolve(addr);
      });
      this.server.on("error", reject);
    });
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.avvio.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  // Route printing (for routeLogger plugin)
  printRoutes(opts: { commonPrefix?: boolean } = {}): string {
    return this.router.prettyPrint({ commonPrefix: opts.commonPrefix });
  }
}
