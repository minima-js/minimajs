import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { moduleDiscovery } from "./index.js";
import { Server } from "../core/server.js";
import type { ServerAdapter } from "../interfaces/server.js";
import Router from "find-my-way";
import { createLogger } from "../logger.js";

const TEST_BASE_DIR = path.join(import.meta.dir, "__test-modules");
let TEST_DIR: string;

// Mock server adapter
const mockAdapter: ServerAdapter<any> = {
  listen: async () => ({ port: 3000, host: "localhost" }) as any,
  close: async () => {},
  remoteAddr: () => null,
};

function createServer() {
  return new Server(mockAdapter, {
    prefix: "",
    logger: createLogger({ enabled: false }),
    router: Router(),
  });
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

  describe("Prefix Handling", () => {
    it("registers module with auto-generated prefix and meta prefix", async () => {
      await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
      await mkdir(path.join(TEST_DIR, "posts"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "users", "module.ts"),
        `export default function(app) { app.get('/list', () => 'users'); }`
      );
      await writeFile(
        path.join(TEST_DIR, "posts", "module.ts"),
        `export default function(app) { app.get('/list', () => 'posts'); }; export const meta = { prefix: '/api/v1/posts' };`
      );
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(hasRoute(server, "GET", "/users/list")).toBe(true);
      expect(hasRoute(server, "GET", "/api/v1/posts/list")).toBe(true);
    });
    it("registers nested modules with cumulative prefixes", async () => {
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
        `export default function(app) { app.get('/list', () => 'users'); }; export const meta = {};`
      );
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(hasRoute(server, "GET", "/api/status")).toBe(true);
      expect(hasRoute(server, "GET", "/api/v1/info")).toBe(true);
      expect(hasRoute(server, "GET", "/api/v1/users/list")).toBe(true);
    });
  });

  describe("Concept: With Root Module", () => {
    it("all modules are nested inside root", async () => {
      /**
       * Structure:
       * /module.ts           <- ROOT with prefix /api
       * /users/module.ts     <- child of root
       * /posts/module.ts     <- child of root
       *
       * Result: All child routes inherit root prefix
       */
      await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
      await mkdir(path.join(TEST_DIR, "posts"), { recursive: true });

      await writeFile(
        path.join(TEST_DIR, "module.ts"),
        `export const meta = { prefix: '/api' };
         export default function(app) { app.get('/health', () => 'ok'); }`
      );

      await writeFile(
        path.join(TEST_DIR, "users", "module.ts"),
        `export default function(app) { app.get('/list', () => 'users'); }; export const meta = {};`
      );

      await writeFile(
        path.join(TEST_DIR, "posts", "module.ts"),
        `export default function(app) { app.get('/list', () => 'posts'); }; export const meta = {};`
      );

      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();

      // Root route with its prefix
      expect(hasRoute(server, "GET", "/api/health")).toBe(true);

      // Child routes inherit root prefix + their own prefix
      expect(hasRoute(server, "GET", "/api/users/list")).toBe(true);
      expect(hasRoute(server, "GET", "/api/posts/list")).toBe(true);
    });

    it("supports deep nesting: root -> child -> grandchild", async () => {
      /**
       * Structure:
       * /module.ts              <- root (prefix: /api)
       * /v1/module.ts           <- child of root (prefix: /v1)
       * /v1/users/module.ts     <- child of v1
       *
       * All prefixes are cumulative
       */
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
        `export default function(app) { app.get('/list', () => 'users'); }; export const meta = {};`
      );

      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();

      // Root route
      expect(hasRoute(server, "GET", "/api/status")).toBe(true);
      // v1 route (root prefix + v1 prefix)
      expect(hasRoute(server, "GET", "/api/v1/info")).toBe(true);
      // users route (root prefix + v1 prefix + users prefix + route)
      expect(hasRoute(server, "GET", "/api/v1/users/list")).toBe(true);
    });

    it("supports plugins array in meta", async () => {
      /**
       * Modules can register plugins via meta.plugins array
       */
      const pluginPath = path.resolve(import.meta.dir, "../plugin.js");
      await writeFile(
        path.join(TEST_DIR, "module.ts"),
        `import { plugin } from '${pluginPath}';
         const customPlugin = plugin(function myPlugin(app) {
           app.get('/from-plugin', () => 'plugin');
         });
         export const meta = { plugins: [customPlugin] };
         export default function(app) { app.get('/from-module', () => 'module'); }`
      );

      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();

      // Both module and plugin routes should exist
      expect(hasRoute(server, "GET", "/from-module")).toBe(true);
      expect(hasRoute(server, "GET", "/from-plugin")).toBe(true);
    });
  });

  describe("Extension Detection", () => {
    it("finds modules with .ts, .js, and .mjs extensions", async () => {
      await mkdir(path.join(TEST_DIR, "test"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "test", "module.ts"),
        `export default function(app) { app.get('/ts-route', () => 'ts'); }; export const meta = {};`
      );
      await writeFile(
        path.join(TEST_DIR, "test", "module.js"),
        `export default function(app) { app.get('/js-route', () => 'js'); }; export const meta = {};`
      );
      await writeFile(
        path.join(TEST_DIR, "test", "module.mjs"),
        `export default function(app) { app.get('/mjs-route', () => 'mjs'); }; export const meta = {};`
      );
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(hasRoute(server, "GET", "/test/ts-route")).toBe(true);
      expect(hasRoute(server, "GET", "/test/js-route")).toBe(true);
      expect(hasRoute(server, "GET", "/test/mjs-route")).toBe(true);
    });
  });

  describe("Custom Index Name", () => {
    it("uses custom index name for modules and root", async () => {
      await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "users", "index.ts"),
        `export default function(app) { app.get('/custom', () => 'custom'); }; export const meta = {};`
      );
      await writeFile(
        path.join(TEST_DIR, "index.ts"),
        `export default function(app) { app.get('/root', () => 'root'); }; export const meta = {};`
      );
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR, index: "index" }));
      await server.ready();
      expect(hasRoute(server, "GET", "/users/custom")).toBe(true);
      expect(hasRoute(server, "GET", "/root")).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty directory", async () => {
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(countRoutes(server)).toBe(0);
    });

    it("handles module with only meta export (no default)", async () => {
      await mkdir(path.join(TEST_DIR, "test1"), { recursive: true });
      await writeFile(path.join(TEST_DIR, "test1", "module.ts"), `export const meta = {};`);
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(countRoutes(server)).toBe(0);
    });

    it("handles module with non-function default export", async () => {
      await mkdir(path.join(TEST_DIR, "test2"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "test2", "module.ts"),
        `export const meta = {}; export default { notAFunction: true };`
      );
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(countRoutes(server)).toBe(0);
    });

    it("throws on module with syntax error", async () => {
      await mkdir(path.join(TEST_DIR, "test3"), { recursive: true });
      await writeFile(path.join(TEST_DIR, "test3", "module.ts"), `this is not valid javascript syntax {{{`);
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      expect(server.ready()).rejects.toThrow();
    });

    it("handles module with missing meta", async () => {
      await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "users", "module.ts"),
        `export default function(app) { app.get('/test', () => 'test'); }`
      );
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(hasRoute(server, "GET", "/users/test")).toBe(true);
    });

    it("handles async module functions", async () => {
      await mkdir(path.join(TEST_DIR, "async"), { recursive: true });
      await writeFile(
        path.join(TEST_DIR, "async", "module.ts"),
        `export default async function(app) { app.get('/async', async () => 'async'); }; export const meta = {};`
      );
      const server = createServer();
      server.register(moduleDiscovery({ root: TEST_DIR }));
      await server.ready();
      expect(hasRoute(server, "GET", "/async/async")).toBe(true);
    });
  });
});
