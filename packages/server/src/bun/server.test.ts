import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "./index.js";
import type { Server } from "./server.js";

describe("Bun Server", () => {
  let app: Server<any>;

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
      app.all("/wildcard", ({ request: req }) => ({ method: req.method }));

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
      app.post("/data", async (ctx) => {
        const body = await ctx.request.json();
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
      await app.close();
      (app as any) = null;
    });
  });

  describe("Server Lifecycle", () => {
    it("should start and stop server", async () => {
      app = createApp({ logger: false });
      app.get("/test", () => ({ running: true }));

      const server = await app.listen({ port: 0 }); // Use random port
      expect(server).toBeDefined();
      expect(server.port).toBeGreaterThan(0);
      expect(app.server).toBeDefined();

      await app.close();
      expect(app.server).toBeDefined(); // Server object still exists after close
    });

    it("should handle listen with custom host", async () => {
      app = createApp({ logger: false });

      const server = await app.listen({ port: 0, host: "127.0.0.1" });
      expect(server.hostname).toBe("127.0.0.1");
      expect(server.port).toBeGreaterThan(0);

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

  describe("Context", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should access context in route handler", async () => {
      const { context } = await import("../context.js");

      app.get("/context-test", () => {
        const ctx = context();
        return { hasContext: !!ctx, hasLocals: ctx.locals instanceof Map };
      });

      const response = await app.inject("/context-test");
      const data = (await response.json()) as any;
      expect(data.hasContext).toBe(true);
      expect(data.hasLocals).toBe(true);
    });

    it("should create and use context values within same request", async () => {
      const { createContext } = await import("../context.js");

      const [getUser, setUser] = createContext<{ name: string }>();

      app.get("/test-context", () => {
        setUser({ name: "John" });
        const user = getUser();
        return { user };
      });

      const response = await app.inject("/test-context");
      const data = (await response.json()) as any;
      expect(data.user).toEqual({ name: "John" });
    });

    it("should use default value in context", async () => {
      const { createContext } = await import("../context.js");

      const [getConfig] = createContext<{ theme: string }>({ theme: "dark" });

      app.get("/config", () => {
        return { config: getConfig() };
      });

      const response = await app.inject("/config");
      const data = (await response.json()) as any;
      expect(data.config).toEqual({ theme: "dark" });
    });

    it("should use callable default value in context", async () => {
      const { createContext } = await import("../context.js");

      const [getTimestamp] = createContext<number>(() => Date.now());

      app.get("/timestamp", () => {
        return { timestamp: getTimestamp() };
      });

      const response = await app.inject("/timestamp");
      const data = (await response.json()) as any;
      expect(typeof data.timestamp).toBe("number");
    });
  });

  describe("Error Classes", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should handle HttpError", async () => {
      const { HttpError } = await import("../error.js");

      app.get("/http-error", () => {
        throw new HttpError("Custom error", 400);
      });

      const response = await app.inject("/http-error");
      expect(response.status).toBe(400);
      const data = (await response.json()) as any;
      expect(data.message).toBe("Custom error");
    });

    it("should handle HttpError with object response", async () => {
      const { HttpError } = await import("../error.js");

      app.get("/http-error-obj", () => {
        throw new HttpError({ error: "Invalid input", field: "email" }, 422);
      });

      const response = await app.inject("/http-error-obj");
      expect(response.status).toBe(422);
      const data = (await response.json()) as any;
      expect(data.error).toBe("Invalid input");
      expect(data.field).toBe("email");
    });

    it("should handle HttpError with headers", async () => {
      const { HttpError } = await import("../error.js");

      app.get("/http-error-headers", () => {
        throw new HttpError("Error with headers", 400, {
          headers: { "X-Custom": "Header" },
        });
      });

      const response = await app.inject("/http-error-headers");
      expect(response.status).toBe(400);
      expect(response.headers.get("X-Custom")).toBe("Header");
    });

    it("should create HttpError from Error instance", async () => {
      const { HttpError } = await import("../error.js");

      app.get("/http-error-from-error", () => {
        const err = HttpError.create(new Error("Original error"), 500);
        throw err;
      });

      const response = await app.inject("/http-error-from-error");
      expect(response.status).toBe(500);
    });

    it("should create HttpError from non-Error value", async () => {
      const { HttpError } = await import("../error.js");

      app.get("/http-error-from-value", () => {
        const err = HttpError.create("some value", 500);
        throw err;
      });

      const response = await app.inject("/http-error-from-value");
      expect(response.status).toBe(500);
    });

    it("should handle ValidationError", async () => {
      const { ValidationError } = await import("../error.js");

      app.get("/validation-error", () => {
        throw new ValidationError("Invalid data");
      });

      const response = await app.inject("/validation-error");
      expect(response.status).toBe(422);
      const data = (await response.json()) as any;
      expect(data.message).toBe("Invalid data");
    });

    it("should handle ForbiddenError", async () => {
      const { ForbiddenError } = await import("../error.js");

      app.get("/forbidden", () => {
        throw new ForbiddenError();
      });

      const response = await app.inject("/forbidden");
      expect(response.status).toBe(403);
      const data = (await response.json()) as any;
      expect(data.message).toBe("Forbidden");
    });

    it("should handle RedirectError", async () => {
      const { RedirectError } = await import("../error.js");

      app.get("/redirect-temp", () => {
        throw new RedirectError("/new-location");
      });

      const response = await app.inject("/redirect-temp");
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/new-location");
    });

    it("should handle RedirectError with permanent redirect", async () => {
      const { RedirectError } = await import("../error.js");

      app.get("/redirect-perm", () => {
        throw new RedirectError("/new-location", true);
      });

      const response = await app.inject("/redirect-perm");
      expect(response.status).toBe(301);
      expect(response.headers.get("Location")).toBe("/new-location");
    });

    it("should handle RedirectError with custom headers", async () => {
      const { RedirectError } = await import("../error.js");

      app.get("/redirect-headers", () => {
        throw new RedirectError("/new-location", false, {
          headers: { "X-Redirect-Reason": "Moved" },
        });
      });

      const response = await app.inject("/redirect-headers");
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/new-location");
      expect(response.headers.get("X-Redirect-Reason")).toBe("Moved");
    });
  });

  describe("Hooks", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should register and run request hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let hookCalled = false;

      app.register(
        hook("request", async () => {
          hookCalled = true;
        })
      );

      app.get("/test", () => ({ success: true }));

      await app.inject("/test");
      expect(hookCalled).toBe(true);
    });

    it("should run request hook that returns early response", async () => {
      const { hook } = await import("../hooks/index.js");

      app.register(
        hook("request", async () => {
          return new Response(JSON.stringify({ intercepted: true }), {
            headers: { "Content-Type": "application/json" },
          });
        })
      );

      app.get("/test", () => ({ success: true }));

      const response = await app.inject("/test");
      const data = (await response.json()) as any;
      expect(data.intercepted).toBe(true);
    });

    it("should register and run transform hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let transformCalled = false;

      app.register(
        hook("transform", async (data) => {
          transformCalled = true;
          return { ...(data as object), transformed: true };
        })
      );

      app.get("/test", () => ({ original: true }));

      const response = await app.inject("/test");
      const data = (await response.json()) as any;
      expect(transformCalled).toBe(true);
      expect(data.original).toBe(true);
      expect(data.transformed).toBe(true);
    });

    it("should register and run send hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let sendCalled = false;

      app.register(
        hook("send", async () => {
          sendCalled = true;
        })
      );

      app.get("/test", () => ({ success: true }));

      await app.inject("/test");
      expect(sendCalled).toBe(true);
    });

    it("should register and run sent hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let sentCalled = false;

      app.register(
        hook("sent", async () => {
          sentCalled = true;
        })
      );

      app.get("/test", () => ({ success: true }));

      await app.inject("/test");
      expect(sentCalled).toBe(true);
    });

    it("should register and run error hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let errorCalled = false;

      app.register(
        hook("error", async (error) => {
          errorCalled = true;
          return { customError: true, originalError: (error as Error).message };
        })
      );

      app.get("/error", () => {
        throw new Error("Test error");
      });

      const response = await app.inject("/error");
      expect(errorCalled).toBe(true);
      const data = (await response.json()) as any;
      expect(data.customError).toBe(true);
      expect(data.originalError).toBe("Test error");
    });

    it("should register and run errorSent hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let errorSentCalled = false;

      app.register(
        hook("errorSent", async () => {
          errorSentCalled = true;
        })
      );

      app.get("/error", () => {
        throw new Error("Test error");
      });

      await app.inject("/error");
      expect(errorSentCalled).toBe(true);
    });

    it("should register listen hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let listenCalled = false;
      let serverObj: any = null;

      app.register(
        hook("listen", async (srv) => {
          listenCalled = true;
          serverObj = srv;
        })
      );

      await app.listen({ port: 0, host: "127.0.0.1" });
      expect(listenCalled).toBe(true);
      expect(serverObj).toBeDefined();
      expect(serverObj.port).toBeGreaterThan(0);
      expect(serverObj.hostname).toBe("127.0.0.1");
      await app.close();
    });

    it("should register close hook", async () => {
      const { hook } = await import("../hooks/index.js");
      let closeCalled = false;

      app.register(
        hook("close", async () => {
          closeCalled = true;
        })
      );

      await app.ready();
      await app.close();
      expect(closeCalled).toBe(true);
      (app as any) = null;
    });

    it("should use hook.lifespan for setup and cleanup", async () => {
      const { hook } = await import("../hooks/index.js");
      let setupCalled = false;
      let cleanupCalled = false;

      app.register(
        hook.lifespan(() => {
          setupCalled = true;
          return () => {
            cleanupCalled = true;
          };
        })
      );

      await app.ready();
      expect(setupCalled).toBe(true);
      expect(cleanupCalled).toBe(false);

      await app.close();
      expect(cleanupCalled).toBe(true);
      (app as any) = null;
    });

    it("should use hook.lifespan with async setup", async () => {
      const { hook } = await import("../hooks/index.js");
      let setupCalled = false;
      let cleanupCalled = false;

      app.register(
        hook.lifespan(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          setupCalled = true;
          return async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            cleanupCalled = true;
          };
        })
      );

      await app.ready();
      expect(setupCalled).toBe(true);

      await app.close();
      expect(cleanupCalled).toBe(true);
      (app as any) = null;
    });

    it("should use hook.define to register multiple hooks", async () => {
      const { hook } = await import("../hooks/index.js");
      let requestCalled = false;
      let sendCalled = false;

      app.register(
        hook.define({
          request: async () => {
            requestCalled = true;
          },
          send: async () => {
            sendCalled = true;
          },
        })
      );

      app.get("/test", () => ({ success: true }));

      await app.inject("/test");
      expect(requestCalled).toBe(true);
      expect(sendCalled).toBe(true);
    });

    it("should handle error thrown in error hook", async () => {
      const { hook } = await import("../hooks/index.js");

      app.register(
        hook("error", async () => {
          throw new Error("Error in error hook");
        })
      );

      app.get("/error", () => {
        throw new Error("Original error");
      });

      const response = await app.inject("/error");
      expect(response.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe("Response State", () => {
    beforeEach(() => {
      app = createApp({ logger: false });
    });

    it("should set response headers in handler", async () => {
      const { context } = await import("../context.js");

      app.get("/headers", () => {
        const ctx = context();
        ctx.responseState.headers.set("X-Custom-Header", "test-value");
        return { success: true };
      });

      const response = await app.inject("/headers");
      expect(response.headers.get("X-Custom-Header")).toBe("test-value");
    });

    it("should set response status", async () => {
      const { context } = await import("../context.js");

      app.get("/status", () => {
        const ctx = context();
        ctx.responseState.status = 201;
        return { created: true };
      });

      const response = await app.inject("/status");
      expect(response.status).toBe(201);
    });
  });
});
