import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "./index.js";
import type { Server } from "./server.js";

describe("Node Server", () => {
  let app: Server;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("createApp", () => {
    it("should create an app with default options", () => {
      app = createApp();
      expect(app).toBeDefined();
      expect(app.router).toBeDefined();
      expect(app.container).toBeDefined();
    });

    it("should create an app with logger disabled", () => {
      app = createApp({ logger: false });
      expect(app).toBeDefined();
      expect(app.log).toBeDefined();
    });

    it("should create an app with custom prefix", () => {
      app = createApp({ prefix: "/api/v1" });
      expect(app.$prefix).toBe("/api/v1");
    });

    it("should create an app with custom router config", () => {
      app = createApp({ router: { ignoreTrailingSlash: false } });
      expect(app.router).toBeDefined();
    });
  });

  describe("HTTP Methods", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should register GET route", async () => {
      app.get("/users", () => ({ method: "GET" }));

      const response = await app.inject("/users");
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ method: "GET" });
    });

    it("should register POST route", async () => {
      app.post("/users", () => ({ method: "POST" }));

      const response = await app.inject(new Request("http://localhost/users", { method: "POST" }));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ method: "POST" });
    });

    it("should register PUT route", async () => {
      app.put("/users/1", () => ({ method: "PUT" }));

      const response = await app.inject(new Request("http://localhost/users/1", { method: "PUT" }));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ method: "PUT" });
    });

    it("should register DELETE route", async () => {
      app.delete("/users/1", () => ({ method: "DELETE" }));

      const response = await app.inject(new Request("http://localhost/users/1", { method: "DELETE" }));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ method: "DELETE" });
    });

    it("should register PATCH route", async () => {
      app.patch("/users/1", () => ({ method: "PATCH" }));

      const response = await app.inject(new Request("http://localhost/users/1", { method: "PATCH" }));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ method: "PATCH" });
    });

    it("should register HEAD route", async () => {
      app.head("/health", () => ({}));

      const response = await app.inject(new Request("http://localhost/health", { method: "HEAD" }));
      expect(response.status).toBe(200);
    });

    it("should register OPTIONS route", async () => {
      app.options("/users", () => ({ method: "OPTIONS" }));

      const response = await app.inject(new Request("http://localhost/users", { method: "OPTIONS" }));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ method: "OPTIONS" });
    });

    it("should register ALL route (wildcard)", async () => {
      app.all("/wildcard", (ctx) => ({ method: ctx.request.method }));

      const getResponse = await app.inject("/wildcard");
      expect(((await getResponse.json()) as any).method).toBe("GET");

      const postResponse = await app.inject(new Request("http://localhost/wildcard", { method: "POST" }));
      expect(((await postResponse.json()) as any).method).toBe("POST");
    });
  });

  describe("Route Parameters", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should handle route parameters", async () => {
      app.get("/users/:id", (req) => {
        const url = new URL(req.url);
        const id = url.pathname.split("/")[2];
        return { id };
      });

      const response = await app.inject("/users/123");
      const data = (await response.json()) as any;
      expect(data.id).toBe("123");
    });

    it("should handle multiple route parameters", async () => {
      app.get("/users/:userId/posts/:postId", (req) => {
        const parts = new URL(req.url).pathname.split("/");
        return { userId: parts[2], postId: parts[4] };
      });

      const response = await app.inject("/users/123/posts/456");
      const data = (await response.json()) as any;
      expect(data.userId).toBe("123");
      expect(data.postId).toBe("456");
    });
  });

  describe("Prefix", () => {
    it("should apply prefix to routes", async () => {
      app = createApp({ logger: false, prefix: "/api" });
      app.get("/users", () => ({ success: true }));

      const response = await app.inject("/api/users");
      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.success).toBe(true);
    });

    it("should allow changing prefix dynamically", async () => {
      app = createApp({ logger: false });
      app.prefix("/v1").get("/users", () => ({ version: 1 }));
      app.prefix("/v2").get("/users", () => ({ version: 2 }));

      const v1Response = await app.inject("/v1/users");
      const v1Data = (await v1Response.json()) as any;
      expect(v1Data.version).toBe(1);

      const v2Response = await app.inject("/v2/users");
      const v2Data = (await v2Response.json()) as any;
      expect(v2Data.version).toBe(2);
    });

    it("should handle prefix exclusion", async () => {
      app = createApp({ logger: false });
      app.prefix("/api", { exclude: ["/health"] });
      app.get("/users", () => ({ prefixed: true }));
      app.get("/health", () => ({ excluded: true }));

      const apiResponse = await app.inject("/api/users");
      expect(apiResponse.status).toBe(200);

      const healthResponse = await app.inject("/health");
      expect(healthResponse.status).toBe(200);
      const healthData = (await healthResponse.json()) as any;
      expect(healthData.excluded).toBe(true);
    });
  });

  describe("Plugin System", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should register sync plugin", async () => {
      let pluginCalled = false;

      app.register((instance) => {
        pluginCalled = true;
        instance.get("/plugin-route", () => ({ fromPlugin: true }));
      });

      await app.ready();
      expect(pluginCalled).toBe(true);

      const response = await app.inject("/plugin-route");
      const data = (await response.json()) as any;
      expect(data.fromPlugin).toBe(true);
    });

    it("should register async plugin", async () => {
      let pluginCalled = false;

      app.register(async (instance) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        pluginCalled = true;
        instance.get("/async-route", () => ({ async: true }));
      });

      await app.ready();
      expect(pluginCalled).toBe(true);

      const response = await app.inject("/async-route");
      const data = (await response.json()) as any;
      expect(data.async).toBe(true);
    });

    it("should register plugin with options", async () => {
      app.register<{ name: string }>(
        async (instance, opts) => {
          instance.get("/greeting", () => ({ message: `Hello ${opts.name}` }));
        },
        { name: "World" }
      );

      await app.ready();

      const response = await app.inject("/greeting");
      const data = (await response.json()) as any;
      expect(data.message).toBe("Hello World");
    });
  });

  describe("Inject (Testing)", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should inject with string URL", async () => {
      app.get("/test", () => ({ injected: true }));

      const response = await app.inject("/test");
      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.injected).toBe(true);
    });

    it("should inject with Request object", async () => {
      app.post("/test", () => ({ method: "POST" }));

      const request = new Request("http://localhost/test", { method: "POST" });
      const response = await app.inject(request);

      expect(response.status).toBe(200);
      const data = (await response.json()) as any;
      expect(data.method).toBe("POST");
    });

    it("should inject with query parameters", async () => {
      app.get("/search", (req) => {
        const url = new URL(req.url);
        return { query: url.searchParams.get("q") };
      });

      const response = await app.inject("/search?q=test");
      const data = (await response.json()) as any;
      expect(data.query).toBe("test");
    });

    it("should inject with request body", async () => {
      app.post("/data", async ({ request: req }) => {
        const body = await req.json();
        return { received: body };
      });

      const request = new Request("http://localhost/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      });

      const response = await app.inject(request);
      const data = (await response.json()) as any;
      expect(data.received).toEqual({ test: "data" });
    });
  });

  describe("Lifecycle", () => {
    it("should call ready hooks", async () => {
      app = createApp({ logger: false });
      let readyCalled = false;

      app.register(async (instance) => {
        instance.container.set(Symbol("ready"), true);
      });

      await app.ready();
      readyCalled = true;

      expect(readyCalled).toBe(true);
    });

    it("should handle close gracefully", async () => {
      app = createApp({ logger: false });

      await app.ready();
      await expect(app.close()).resolves.not.toThrow();
    });
  });

  describe("Server Lifecycle", () => {
    it("should start and stop server", async () => {
      app = createApp({ logger: false });
      app.get("/test", () => ({ running: true }));

      const addr = await app.listen({ port: 0 }); // Use random port
      expect(addr).toMatch(/^http:\/\//);
      expect(app.server).toBeDefined();

      await app.close();
      expect(app.server).toBeDefined(); // Server object still exists after close
    });

    it("should handle listen with custom host", async () => {
      app = createApp({ logger: false });

      const addr = await app.listen({ port: 0, host: "127.0.0.1" });
      expect(addr).toMatch(/^http:\/\/127\.0\.0\.1:/);

      await app.close();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should handle route handler errors", async () => {
      app.get("/error", () => {
        throw new Error("Test error");
      });

      const response = await app.inject("/error");
      expect(response.status).toBeGreaterThanOrEqual(500);
    });

    it("should handle 404 for non-existent routes", async () => {
      const response = await app.inject("/non-existent");
      expect(response.status).toBe(404);
    });
  });

  describe("Custom Serializer", () => {
    it("should use custom serializer", async () => {
      app = createApp({ logger: false });
      app.serialize = (data) => `Custom: ${JSON.stringify(data)}`;
      app.get("/custom", () => ({ test: true }));

      const response = await app.inject("/custom");
      const text = await response.text();
      expect(text).toBe('Custom: {"test":true}');
    });
  });

  describe("Node.js Specific Features", () => {
    it("should handle Node.js IncomingMessage to Web Request conversion", async () => {
      app = createApp({ logger: false });
      app.get("/headers", ({ request: req }) => {
        return {
          host: req.headers.get("host"),
          userAgent: req.headers.get("user-agent"),
        };
      });

      const response = await app.inject(
        new Request("http://localhost/headers", {
          headers: {
            "User-Agent": "test-agent",
          },
        })
      );

      const data = (await response.json()) as any;
      expect(data.host).toBe("localhost");
      expect(data.userAgent).toBe("test-agent");
    });

    it("should handle Web Response to ServerResponse conversion", async () => {
      app = createApp({ logger: false });
      app.get("/response-test", () => {
        return { status: "ok", timestamp: new Date().toISOString() };
      });

      const response = await app.inject("/response-test");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");

      const data = (await response.json()) as any;
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });
  });
});
