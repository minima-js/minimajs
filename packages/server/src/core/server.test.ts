import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createBaseServer, Server } from "./index.js";
import type { ServerAdapter, AddressInfo } from "../interfaces/server.js";
import { createRequest } from "../mock/request.js";
import { getBody } from "../__tests__/helpers/index.js";

const mockAdapter: ServerAdapter<any> = {
  listen: async () => ({
    server: {} as any,
    address: {
      hostname: "localhost",
      port: 3000,
      family: "IPv4",
      protocol: "http",
      address: "http://localhost:3000/",
    } as AddressInfo,
  }),
  close: async () => {},
  remoteAddr: () => null,
};

const createApp = () => createBaseServer(mockAdapter, { moduleDiscovery: false, logger: false });

describe("Core Server", () => {
  let app: Server<any>;

  afterEach(async () => {
    if (app) await app.close();
  });

  describe("createBaseServer", () => {
    test("should create server with options", () => {
      app = createApp();
      expect(app.router).toBeDefined();
      expect(app.container).toBeDefined();
      expect(app.log).toBeDefined();

      app = createBaseServer(mockAdapter, { moduleDiscovery: false, logger: false, prefix: "/api/v1" });
      expect(app.prefix).toBe("/api/v1");
    });
  });

  describe("HTTP Methods", () => {
    beforeEach(() => {
      app = createApp();
    });

    test.each([
      ["GET", "/users", () => ({ method: "GET" })],
      ["POST", "/users", () => ({ method: "POST" })],
      ["PUT", "/users/1", () => ({ method: "PUT" })],
      ["DELETE", "/users/1", () => ({ method: "DELETE" })],
      ["PATCH", "/users/1", () => ({ method: "PATCH" })],
    ])("should register %s route", async (method, path, handler) => {
      (app as any)[method.toLowerCase()](path, handler);
      const response = await app.handle(new Request(`http://localhost${path}`, { method }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ method });
    });

    test("should register HEAD, OPTIONS, and ALL routes", async () => {
      app.head("/health", () => ({}));
      app.options("/users", () => ({ method: "OPTIONS" }));
      app.all("/wildcard", ({ request: req }: any) => ({ method: req.method }));

      expect((await app.handle(new Request("http://localhost/health", { method: "HEAD" }))).status).toBe(200);
      expect(await (await app.handle(new Request("http://localhost/users", { method: "OPTIONS" }))).json()).toEqual({
        method: "OPTIONS",
      });
      expect(await (await app.handle(createRequest("/wildcard"))).json()).toEqual({ method: "GET" });
      expect(await (await app.handle(new Request("http://localhost/wildcard", { method: "POST" }))).json()).toEqual({
        method: "POST",
      });
    });
  });

  describe("Route Parameters", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should handle single and multiple route parameters", async () => {
      app.get("/users/:id", ({ route }: any) => ({ id: route?.params?.id }));
      app.get("/users/:userId/posts/:postId", ({ route }: any) => ({
        userId: route?.params?.userId,
        postId: route?.params?.postId,
      }));

      expect(await (await app.handle(createRequest("/users/123"))).json()).toEqual({ id: "123" });
      const multi = await (await app.handle(createRequest("/users/123/posts/456"))).json();
      expect(multi).toEqual({ userId: "123", postId: "456" });
    });
  });

  describe("Prefix", () => {
    test("should apply prefix and allow dynamic prefix changes", async () => {
      app = createBaseServer(mockAdapter, { moduleDiscovery: false, logger: false, prefix: "/api" });
      app.get("/users", () => ({ success: true }));
      expect(await (await app.handle(createRequest("/api/users"))).json()).toEqual({ success: true });

      app = createApp();
      app.register((app: any) => app.get("/users", () => ({ version: 1 })), { prefix: "/v1" });
      app.register((app: any) => app.get("/users", () => ({ version: 2 })), { prefix: "/v2" });
      expect(await (await app.handle(createRequest("/v1/users"))).json()).toEqual({ version: 1 });
      expect(await (await app.handle(createRequest("/v2/users"))).json()).toEqual({ version: 2 });
    });
  });

  describe("Plugin System", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should register sync, async, and plugins with options", async () => {
      let syncCalled = false;
      app.register((instance: any) => {
        syncCalled = true;
        instance.get("/sync", () => ({ sync: true }));
      });

      let asyncCalled = false;
      app.register(async (instance: any) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        asyncCalled = true;
        instance.get("/async", () => ({ async: true }));
      });

      app.register<{ name: string }>(
        async (instance: any, opts: { name: string }) => {
          instance.get("/greeting", () => ({ message: `Hello ${opts.name}` }));
        },
        { name: "World" }
      );

      await app.ready();
      expect(syncCalled).toBe(true);
      expect(asyncCalled).toBe(true);

      expect(await (await app.handle(createRequest("/sync"))).json()).toEqual({ sync: true });
      expect(await (await app.handle(createRequest("/async"))).json()).toEqual({ async: true });
      expect(await (await app.handle(createRequest("/greeting"))).json()).toEqual({ message: "Hello World" });
    });
  });

  describe("Request Handling", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should handle Request object, query params, and body", async () => {
      app.post("/test", () => ({ method: "POST" }));
      app.get("/search", ({ request: req }: any) => ({ query: new URL(req.url).searchParams.get("q") }));
      const { body } = await import("../http.js");
      app.post("/data", () => ({ received: body<{ test: string }>() }));

      expect(await (await app.handle(new Request("http://localhost/test", { method: "POST" }))).json()).toEqual({
        method: "POST",
      });
      expect(await (await app.handle(createRequest("/search?q=test"))).json()).toEqual({ query: "test" });
      const req = new Request("http://localhost/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      });
      expect(await (await app.handle(req)).json()).toEqual({ received: { test: "data" } });
    });
  });

  describe("Lifecycle", () => {
    test("should handle ready and close", async () => {
      app = createApp();
      let readyCalled = false;
      app.register(async (instance: any) => {
        instance.container[Symbol("ready")] = true;
        readyCalled = true;
      });
      await app.ready();
      expect(readyCalled).toBe(true);
      expect(await app.close()).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should handle route errors and 404s", async () => {
      app.get("/error", () => {
        throw new Error("Test error");
      });

      const errorResponse = await app.handle(createRequest("/error"));
      expect(errorResponse.status).toBeGreaterThanOrEqual(500);
      expect((await getBody(errorResponse)).message).toBe("Unable to process request");

      expect((await app.handle(createRequest("/non-existent"))).status).toBe(404);
    });
  });

  describe("Custom Serializer", () => {
    test("should use custom serializer", async () => {
      app = createApp();
      app.serialize = (data) => `Custom: ${JSON.stringify(data)}`;
      app.get("/custom", () => ({ test: true }));
      expect(await (await app.handle(createRequest("/custom"))).text()).toBe('Custom: {"test":true}');
    });
  });

  describe("Context", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should access and create context values", async () => {
      const { context, createContext } = await import("../context.js");

      app.get("/ctx", () => {
        const ctx = context();
        return { hasContext: !!ctx, hasLocals: !!ctx.locals };
      });

      const [getUser, setUser] = createContext<{ name: string }>();
      app.get("/user", () => {
        setUser({ name: "John" });
        return { user: getUser() };
      });

      expect(await (await app.handle(createRequest("/ctx"))).json()).toEqual({ hasContext: true, hasLocals: true });
      expect(await (await app.handle(createRequest("/user"))).json()).toEqual({ user: { name: "John" } });
    });
  });

  describe("Error Classes", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should handle HttpError and RedirectError", async () => {
      const { HttpError, RedirectError } = await import("../error.js");

      app.get("/http-error", () => {
        throw new HttpError("Custom error", 400);
      });
      app.get("/redirect", () => {
        throw new RedirectError("/new-location");
      });

      const httpRes = await app.handle(createRequest("/http-error"));
      expect(httpRes.status).toBe(400);
      expect(await httpRes.json()).toEqual({ message: "Custom error" });

      const redirectRes = await app.handle(createRequest("/redirect"));
      expect(redirectRes.status).toBe(302);
      expect(redirectRes.headers.get("Location")).toBe("/new-location");
    });
  });

  describe("Hooks", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should register and run request and error hooks", async () => {
      const { hook } = await import("../hooks/index.js");
      let requestCalled = false;
      let errorCalled = false;

      app.register(
        hook("request", async () => {
          requestCalled = true;
        })
      );
      app.register(
        hook("error", async (error) => {
          errorCalled = true;
          return { customError: true, originalError: (error as Error).message };
        })
      );

      app.get("/test", () => ({ success: true }));
      app.get("/error", () => {
        throw new Error("Test error");
      });

      await app.handle(createRequest("/test"));
      expect(requestCalled).toBe(true);

      const errorRes = await app.handle(createRequest("/error"));
      expect(errorCalled).toBe(true);
      expect(await errorRes.json()).toEqual({ customError: true, originalError: "Test error" });
    });
  });

  describe("Response State", () => {
    beforeEach(() => {
      app = createApp();
    });

    test("should set response headers and status", async () => {
      const { context } = await import("../context.js");

      app.get("/headers", () => {
        context().responseState.headers.set("X-Custom-Header", "test-value");
        return { success: true };
      });
      app.get("/status", () => {
        context().responseState.status = 201;
        return { created: true };
      });

      expect((await app.handle(createRequest("/headers"))).headers.get("X-Custom-Header")).toBe("test-value");
      expect((await app.handle(createRequest("/status"))).status).toBe(201);
    });
  });
});
