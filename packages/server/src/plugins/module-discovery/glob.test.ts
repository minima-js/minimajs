import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { moduleDiscovery } from "./index.js";
import { Server } from "../../core/server.js";
import type { ServerAdapter } from "../../interfaces/server.js";
import Router from "find-my-way";
import { createLogger } from "../../logger.js";

const TEST_BASE_DIR = path.join(import.meta.dir, "__test-glob-modules");
let TEST_DIR: string;

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

function hasRoute(server: Server<any>, method: string, path: string): boolean {
  const routes = (server.router as any).routes;
  return routes.some((r: any) => r.method === method && r.path === path);
}

describe("Module Discovery Glob Pattern", () => {
  beforeEach(async () => {
    TEST_DIR = path.join(TEST_BASE_DIR, `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    await mkdir(TEST_DIR, { recursive: true });
  });
  afterEach(async () => {
    try {
      await rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // pass
    }
  });

  it("supports *.module pattern in index", async () => {
    await mkdir(path.join(TEST_DIR, "users"), { recursive: true });
    await writeFile(
      path.join(TEST_DIR, "users", "users.module.ts"),
      `export default function(app) { app.get('/list', () => 'users'); }`
    );

    const server = createServer();
    server.register(moduleDiscovery({ root: TEST_DIR, index: "*.module" }));
    await server.ready();

    expect(hasRoute(server, "GET", "/users/list")).toBe(true);
  });
});
