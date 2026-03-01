import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { moduleDiscovery } from "./index.js";
import { Server } from "../../core/server.js";
import type { ServerAdapter } from "../../interfaces/server.js";
import Router from "find-my-way";
import { createLogger } from "../../logger.js";

const TEST_BASE_DIR = path.join(import.meta.dir, "__test-modules");
let TEST_DIR: string;

const mockAdapter: ServerAdapter<any> = {
  listen: async () => ({ host: "localhost" }) as any,
  close: async () => {},
  remoteAddr: () => null,
};

function createServer(root: string, opts?: { index?: string }) {
  const server = new Server(mockAdapter, {
    prefix: "",
    logger: createLogger({ enabled: false }),
    router: Router(),
  });
  server.register(moduleDiscovery({ root, index: opts?.index }));
  return server;
}

function getRoutes(server: Server<any>) {
  return (server.router as any).routes;
}

function hasRoute(server: Server<any>, method: string, path: string): boolean {
  const routes = getRoutes(server);
  return routes.some((r: any) => r.method === method && r.path === path);
}

function countRoutes(server: Server<any>): number {
  return getRoutes(server).length;
}

describe("Module Discovery", () => {
  beforeEach(async () => {
    TEST_DIR = path.join(TEST_BASE_DIR, `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    await mkdir(TEST_DIR, { recursive: true });
  });
  afterEach(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      await rm(TEST_BASE_DIR, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe("Root Module", () => {
    test("children inherit root prefix", async () => {
      // /module.ts          prefix: /api  -> GET /api/health
      // /users/module.ts    auto prefix   -> GET /api/users/list
      // /posts/module.ts    auto prefix   -> GET /api/posts/list
      await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
      await mkdir(path.join(TEST_DIR, "posts"), { recursive: true });

      await writeFile(
        path.join(TEST_DIR, "module.ts"),
        `export const meta = { prefix: '/api' };
         export default function(app) { app.get('/health', () => 'ok'); }`
      );
      await writeFile(
        path.join(TEST_DIR, "users", "module.ts"),
        `export default function(app) { app.get('/list', () => 'users'); }`
      );
      await writeFile(
        path.join(TEST_DIR, "posts", "module.ts"),
        `export default function(app) { app.get('/list', () => 'posts'); }`
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/api/health")).toBe(true);
      expect(hasRoute(server, "GET", "/api/users/list")).toBe(true);
      expect(hasRoute(server, "GET", "/api/posts/list")).toBe(true);
    });

    test("deep nesting with cumulative prefixes", async () => {
      // /module.ts             prefix: /api  -> GET /api/status
      // /v1/module.ts          prefix: /v1   -> GET /api/v1/info
      // /v1/users/module.ts    auto prefix   -> GET /api/v1/users/list
      await mkdir(path.join(TEST_DIR, "v1", "users"), { recursive: true });

      await writeFile(
        path.join(TEST_DIR, "module.ts"),
        `export const meta = { prefix: '/api' };
         export default function(app) { app.get('/status', () => 'ok'); }`
      );
      await writeFile(
        path.join(TEST_DIR, "v1", "module.ts"),
        `export const meta = { prefix: '/v1' };
         export default function(app) { app.get('/info', () => 'v1'); }`
      );
      await writeFile(
        path.join(TEST_DIR, "v1", "users", "module.ts"),
        `export default function(app) { app.get('/list', () => 'users'); }`
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/api/status")).toBe(true);
      expect(hasRoute(server, "GET", "/api/v1/info")).toBe(true);
      expect(hasRoute(server, "GET", "/api/v1/users/list")).toBe(true);
    });

    test("meta.plugins registers additional plugins", async () => {
      // meta.plugins array allows a module to register sibling plugins
      // both the module's default export and plugin routes end up registered
      const pluginPath = path.resolve(import.meta.dir, "../../plugin.js");
      await writeFile(
        path.join(TEST_DIR, "module.ts"),
        `import { plugin } from '${pluginPath}';
         const customPlugin = plugin(function myPlugin(app) {
           app.get('/from-plugin', () => 'plugin');
         });
         export const meta = { plugins: [customPlugin] };
         export default function(app) { app.get('/from-module', () => 'module'); }`
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/from-module")).toBe(true);
      expect(hasRoute(server, "GET", "/from-plugin")).toBe(true);
    });
  });

  describe("Child Modules", () => {
    test("auto-generates prefix from directory name", async () => {
      await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "users", "module.ts"),
        `export default function(app) { app.get('/list', () => 'users'); }`
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/users/list")).toBe(true);
    });

    test("meta prefix overrides directory name", async () => {
      await mkdir(path.join(TEST_DIR, "posts"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "posts", "module.ts"),
        `export const meta = { prefix: '/api/v1/posts' };
         export default function(app) { app.get('/list', () => 'posts'); }`
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/api/v1/posts/list")).toBe(true);
    });

    test("async default export", async () => {
      await mkdir(path.join(TEST_DIR, "async"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "async", "module.ts"),
        `export default async function(app) { app.get('/data', async () => 'async'); }`
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/async/data")).toBe(true);
    });

    test("only meta export (no default, no routes) registers nothing", async () => {
      await mkdir(path.join(TEST_DIR, "empty"), { recursive: true });
      await writeFile(path.join(TEST_DIR, "empty", "module.ts"), `export const meta = {};`);

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(countRoutes(server)).toBe(0);
    });

    test("non-function default export registers nothing", async () => {
      await mkdir(path.join(TEST_DIR, "bad"), { recursive: true });
      await writeFile(path.join(TEST_DIR, "bad", "module.ts"), `export default { notAFunction: true };`);

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(countRoutes(server)).toBe(0);
    });

    test("syntax error throws", async () => {
      await mkdir(path.join(TEST_DIR, "broken"), { recursive: true });
      await writeFile(path.join(TEST_DIR, "broken", "module.ts"), `this is not valid javascript syntax {{{`);

      const server = createServer(TEST_DIR);

      expect(server.ready()).rejects.toThrow();
    });

    test("empty directory registers nothing", async () => {
      const server = createServer(TEST_DIR);
      await server.ready();

      expect(countRoutes(server)).toBe(0);
    });
  });

  describe("Routes Export", () => {
    test("registers routes with multiple HTTP methods", async () => {
      // routes export maps "METHOD /path" keys to handler functions
      // handlers can be named functions or inline arrows
      await mkdir(path.join(TEST_DIR, "items"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "items", "module.ts"),
        `
        function getItems() { return 'list'; }
        function createItem() { return 'create'; }
        export const routes = {
          "GET /": getItems,
          "POST /": createItem,
          "GET /:id": () => 'get',
          "PUT /:id": () => 'update',
          "DELETE /:id": () => 'delete',
        };
        `
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/items/")).toBe(true);
      expect(hasRoute(server, "POST", "/items/")).toBe(true);
      expect(hasRoute(server, "GET", "/items/:id")).toBe(true);
      expect(hasRoute(server, "PUT", "/items/:id")).toBe(true);
      expect(hasRoute(server, "DELETE", "/items/:id")).toBe(true);
    });

    test("combines with default export", async () => {
      // a module can use both routes export and default export
      // routes are registered first, then default export runs
      await mkdir(path.join(TEST_DIR, "combo"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "combo", "module.ts"),
        `
        export const routes = {
          "GET /from-routes": () => 'routes',
        };
        export default function(app) {
          app.get('/from-default', () => 'default');
        }
        `
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/combo/from-routes")).toBe(true);
      expect(hasRoute(server, "GET", "/combo/from-default")).toBe(true);
    });

    test("routes-only module (no default export)", async () => {
      await mkdir(path.join(TEST_DIR, "static"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "static", "module.ts"),
        `
        export const routes = {
          "GET /health": () => 'ok',
          "GET /version": () => '1.0',
        };
        `
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/static/health")).toBe(true);
      expect(hasRoute(server, "GET", "/static/version")).toBe(true);
    });

    test("respects meta prefix", async () => {
      await mkdir(path.join(TEST_DIR, "auth"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "auth", "module.ts"),
        `
        export const meta = { prefix: '/api/auth' };
        export const routes = {
          "POST /login": () => 'login',
          "POST /logout": () => 'logout',
        };
        `
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "POST", "/api/auth/login")).toBe(true);
      expect(hasRoute(server, "POST", "/api/auth/logout")).toBe(true);
    });

    test("inherits parent prefix", async () => {
      // /module.ts          prefix: /api (root, no routes)
      // /v1/module.ts       prefix: /v1  (no routes)
      // /v1/users/module.ts routes only  -> GET /api/v1/users/profile
      await mkdir(path.join(TEST_DIR, "v1", "users"), { recursive: true });
      await writeFile(path.join(TEST_DIR, "module.ts"), `export const meta = { prefix: '/api' };`);
      await writeFile(path.join(TEST_DIR, "v1", "module.ts"), `export const meta = { prefix: '/v1' };`);
      await writeFile(
        path.join(TEST_DIR, "v1", "users", "module.ts"),
        `
        export const routes = {
          "GET /profile": () => 'profile',
        };
        `
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/api/v1/users/profile")).toBe(true);
    });
  });

  describe("Options", () => {
    test("custom index name", async () => {
      await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "users", "index.ts"),
        `export default function(app) { app.get('/custom', () => 'custom'); }`
      );
      await writeFile(path.join(TEST_DIR, "index.ts"), `export default function(app) { app.get('/root', () => 'root'); }`);

      const server = createServer(TEST_DIR, { index: "index.{js,ts}" });
      await server.ready();

      expect(hasRoute(server, "GET", "/users/custom")).toBe(true);
      expect(hasRoute(server, "GET", "/root")).toBe(true);
    });

    test("finds .ts and .js modules", async () => {
      await mkdir(path.join(TEST_DIR, "test"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "test", "module.ts"),
        `export default function(app) { app.get('/ts-route', () => 'ts'); }`
      );
      await writeFile(
        path.join(TEST_DIR, "test", "module.js"),
        `export default function(app) { app.get('/js-route', () => 'js'); }`
      );

      const server = createServer(TEST_DIR);
      await server.ready();

      expect(hasRoute(server, "GET", "/test/ts-route")).toBe(true);
      expect(hasRoute(server, "GET", "/test/js-route")).toBe(true);
    });
  });
});
