import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import type { Server } from "node:http";
import { createApp } from "../node/index.js";
import { createRequest } from "../mock/request.js";
import type { App } from "../interfaces/index.js";
import { middleware } from "../hooks/index.js";

describe("middleware", () => {
  let app: App<Server>;

  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app?.close());

  describe("composeMiddleware", () => {
    test("should execute a single middleware", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("middleware");
          return next();
        })
      );

      app.get("/test", () => {
        executionLog.push("handler");
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ success: true });
      expect(executionLog).toEqual(["middleware", "handler"]);
    });

    test("should execute multiple middlewares in order", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(
          async (_ctx, next) => {
            executionLog.push("middleware1-before");
            const response = await next();
            executionLog.push("middleware1-after");
            return response;
          },
          async (_ctx, next) => {
            executionLog.push("middleware2-before");
            const response = await next();
            executionLog.push("middleware2-after");
            return response;
          },
          async (_ctx, next) => {
            executionLog.push("middleware3-before");
            const response = await next();
            executionLog.push("middleware3-after");
            return response;
          }
        )
      );

      app.get("/test", () => {
        executionLog.push("handler");
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ success: true });
      expect(executionLog).toEqual([
        "middleware1-before",
        "middleware2-before",
        "middleware3-before",
        "handler",
        "middleware3-after",
        "middleware2-after",
        "middleware1-after",
      ]);
    });

    test("should allow middleware to modify context", async () => {
      app.register(
        middleware(async (ctx, next) => {
          (ctx as any).customProperty = "custom-value";
          return next();
        })
      );

      app.get("/test", (ctx) => {
        return { value: (ctx as any).customProperty };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ value: "custom-value" });
    });

    test("should allow middleware to short-circuit the chain", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(
          async (_ctx, next) => {
            executionLog.push("middleware1");
            return next();
          },
          async (_ctx, _next) => {
            executionLog.push("middleware2-short-circuit");
            // Don't call next(), return early
            return new Response(JSON.stringify({ shortCircuit: true }), {
              headers: { "content-type": "application/json" },
            });
          },
          async (_ctx, next) => {
            executionLog.push("middleware3");
            return next();
          }
        )
      );

      app.get("/test", () => {
        executionLog.push("handler");
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ shortCircuit: true });
      expect(executionLog).toEqual(["middleware1", "middleware2-short-circuit"]);
    });

    test("should return error response when next() is called multiple times", async () => {
      app.register(
        middleware(async (_ctx, next) => {
          await next();
          await next(); // Call next() again - this should throw
          return new Response();
        })
      );

      app.get("/test", () => ({ success: true }));

      const response = await app.handle(createRequest("/test"));
      // Error is caught by contextProvider and converted to error response
      expect(response.status).toBe(500);
    });

    test("should handle async middlewares", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(
          async (_ctx, next) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            executionLog.push("middleware1");
            return next();
          },
          async (_ctx, next) => {
            await new Promise((resolve) => setTimeout(resolve, 1));
            executionLog.push("middleware2");
            return next();
          }
        )
      );

      app.get("/test", () => {
        executionLog.push("handler");
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ success: true });
      expect(executionLog).toEqual(["middleware1", "middleware2", "handler"]);
    });

    test("should allow middleware to modify response", async () => {
      app.register(
        middleware(async (_ctx, next) => {
          const response = await next();
          const data: any = await response.json();
          return new Response(JSON.stringify({ ...data, modified: true }), {
            headers: { "content-type": "application/json" },
          });
        })
      );

      app.get("/test", () => ({ original: true }));

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ original: true, modified: true });
    });

    test("should work with request headers", async () => {
      app.register(
        middleware(async (ctx, next) => {
          const authHeader = ctx.request.headers.get("authorization");
          if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            });
          }
          return next();
        })
      );

      app.get("/test", () => ({ success: true }));

      // Request without auth header
      const response1 = await app.handle(createRequest("/test"));
      const data1 = await response1.json();
      expect(response1.status).toBe(401);
      expect(data1).toEqual({ error: "Unauthorized" });

      // Request with auth header
      const response2 = await app.handle(
        createRequest("/test", {
          headers: { authorization: "Bearer token" },
        })
      );
      const data2 = await response2.json();
      expect(response2.status).toBe(200);
      expect(data2).toEqual({ success: true });
    });

    test("should handle middleware with response headers", async () => {
      app.register(
        middleware(async (_ctx, next) => {
          const response = await next();
          const newHeaders = new Headers(response.headers);
          newHeaders.set("x-custom-header", "custom-value");
          return new Response(response.body, {
            status: response.status,
            headers: newHeaders,
          });
        })
      );

      app.get("/test", () => ({ success: true }));

      const response = await app.handle(createRequest("/test"));

      expect(response.headers.get("x-custom-header")).toBe("custom-value");
    });

    test("should handle middleware execution order with timing", async () => {
      const timings: Array<{ name: string; timestamp: number }> = [];
      const startTime = Date.now();

      app.register(
        middleware(
          async (_ctx, next) => {
            timings.push({ name: "m1-start", timestamp: Date.now() - startTime });
            await new Promise((resolve) => setTimeout(resolve, 10));
            const response = await next();
            timings.push({ name: "m1-end", timestamp: Date.now() - startTime });
            return response;
          },
          async (_ctx, next) => {
            timings.push({ name: "m2-start", timestamp: Date.now() - startTime });
            await new Promise((resolve) => setTimeout(resolve, 5));
            const response = await next();
            timings.push({ name: "m2-end", timestamp: Date.now() - startTime });
            return response;
          }
        )
      );

      app.get("/test", async () => {
        timings.push({ name: "handler", timestamp: Date.now() - startTime });
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ success: true });
      // Verify order (timestamps should be in order for start/end pairs)
      expect(timings.map((t) => t.name)).toEqual(["m1-start", "m2-start", "handler", "m2-end", "m1-end"]);
    });

    test("should handle middleware with different HTTP methods", async () => {
      const methodLog: string[] = [];

      app.register(
        middleware(async (ctx, next) => {
          methodLog.push(ctx.request.method);
          return next();
        })
      );

      app.get("/test", () => ({ method: "GET" }));
      app.post("/test", () => ({ method: "POST" }));
      app.put("/test", () => ({ method: "PUT" }));

      await app.handle(createRequest("/test", { method: "GET" }));
      await app.handle(createRequest("/test", { method: "POST" }));
      await app.handle(createRequest("/test", { method: "PUT" }));

      expect(methodLog).toEqual(["GET", "POST", "PUT"]);
    });

    test("should handle middleware with route parameters", async () => {
      const paramsLog: any[] = [];

      app.register(
        middleware(async (ctx, next) => {
          paramsLog.push({ ...ctx.route?.params });
          return next();
        })
      );

      app.get("/users/:id", (ctx) => ctx.route?.params);

      const response = await app.handle(createRequest("/users/123"));
      const data = await response.json();

      expect(data).toEqual({ id: "123" });
      expect(paramsLog).toEqual([{ id: "123" }]);
    });

    test("should maintain context across middleware chain", async () => {
      app.register(
        middleware(
          async (ctx, next) => {
            (ctx as any).value1 = "first";
            return next();
          },
          async (ctx, next) => {
            (ctx as any).value2 = "second";
            return next();
          },
          async (ctx, next) => {
            (ctx as any).value3 = "third";
            return next();
          }
        )
      );

      app.get("/test", (ctx) => ({
        v1: (ctx as any).value1,
        v2: (ctx as any).value2,
        v3: (ctx as any).value3,
      }));

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({
        v1: "first",
        v2: "second",
        v3: "third",
      });
    });

    test("should handle multiple middleware registrations", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("middleware1");
          return next();
        })
      );

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("middleware2");
          return next();
        })
      );

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("middleware3");
          return next();
        })
      );

      app.get("/test", () => {
        executionLog.push("handler");
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ success: true });
      expect(executionLog).toEqual(["middleware1", "middleware2", "middleware3", "handler"]);
    });
  });

  describe("real-world middleware scenarios", () => {
    test("should work with logging middleware", async () => {
      const logs: string[] = [];

      app.register(
        middleware(async (ctx, next) => {
          const start = Date.now();
          logs.push(`${ctx.request.method} ${ctx.request.url} - START`);
          const response = await next();
          const duration = Date.now() - start;
          logs.push(`${ctx.request.method} ${ctx.request.url} - END (${duration}ms)`);
          return response;
        })
      );

      app.get("/test", () => ({ success: true }));

      await app.handle(createRequest("/test"));

      expect(logs).toHaveLength(2);
      expect(logs[0]).toContain("GET");
      expect(logs[0]).toContain("START");
      expect(logs[1]).toContain("END");
    });

    test("should work with authentication middleware", async () => {
      app.register(
        middleware(async (ctx, next) => {
          const token = ctx.request.headers.get("authorization")?.replace("Bearer ", "");

          if (!token) {
            return new Response(JSON.stringify({ error: "No token provided" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            });
          }

          // Simulate token validation
          if (token !== "valid-token") {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            });
          }

          (ctx as any).user = { id: 1, name: "Test User" };
          return next();
        })
      );

      app.get("/protected", (ctx) => ({
        message: "Protected resource",
        user: (ctx as any).user,
      }));

      // No token
      const res1 = await app.handle(createRequest("/protected"));
      expect(res1.status).toBe(401);
      expect(await res1.json()).toEqual({ error: "No token provided" });

      // Invalid token
      const res2 = await app.handle(
        createRequest("/protected", {
          headers: { authorization: "Bearer invalid-token" },
        })
      );
      expect(res2.status).toBe(401);
      expect(await res2.json()).toEqual({ error: "Invalid token" });

      // Valid token
      const res3 = await app.handle(
        createRequest("/protected", {
          headers: { authorization: "Bearer valid-token" },
        })
      );
      expect(res3.status).toBe(200);
      expect(await res3.json()).toEqual({
        message: "Protected resource",
        user: { id: 1, name: "Test User" },
      });
    });

    test("should work with CORS middleware", async () => {
      app.register(
        middleware(async (_ctx, next) => {
          const response = await next();
          const headers = new Headers(response.headers);
          headers.set("access-control-allow-origin", "*");
          headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE");
          headers.set("access-control-allow-headers", "Content-Type, Authorization");

          return new Response(response.body, {
            status: response.status,
            headers,
          });
        })
      );

      app.get("/test", () => ({ success: true }));

      const response = await app.handle(createRequest("/test"));

      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(response.headers.get("access-control-allow-methods")).toBe("GET, POST, PUT, DELETE");
      expect(response.headers.get("access-control-allow-headers")).toBe("Content-Type, Authorization");
    });

    test("should work with request timing middleware", async () => {
      app.register(
        middleware(async (_ctx, next) => {
          const start = Date.now();
          const response = await next();
          const duration = Date.now() - start;
          const headers = new Headers(response.headers);
          headers.set("x-response-time", `${duration}ms`);

          return new Response(response.body, {
            status: response.status,
            headers,
          });
        })
      );

      app.get("/test", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const responseTime = response.headers.get("x-response-time");

      expect(responseTime).toBeTruthy();
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    test("should combine multiple middleware types", async () => {
      const executionLog: string[] = [];

      // Logging middleware
      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("logging-start");
          const response = await next();
          executionLog.push("logging-end");
          return response;
        })
      );

      // Auth middleware
      app.register(
        middleware(async (ctx, next) => {
          executionLog.push("auth-check");
          (ctx as any).authenticated = true;
          return next();
        })
      );

      // Timing middleware
      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("timing-start");
          const response = await next();
          executionLog.push("timing-end");
          return response;
        })
      );

      app.get("/test", (ctx) => {
        executionLog.push("handler");
        return { authenticated: (ctx as any).authenticated };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(data).toEqual({ authenticated: true });
      expect(executionLog).toEqual(["logging-start", "auth-check", "timing-start", "handler", "timing-end", "logging-end"]);
    });

    test("should handle rate limiting middleware", async () => {
      const requestCounts = new Map<string, number>();

      app.register(
        middleware(async (ctx, next) => {
          const ip = ctx.request.headers.get("x-forwarded-for") || "unknown";
          const count = requestCounts.get(ip) || 0;

          if (count >= 3) {
            return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
              status: 429,
              headers: { "content-type": "application/json" },
            });
          }

          requestCounts.set(ip, count + 1);
          return next();
        })
      );

      app.get("/test", () => ({ success: true }));

      // First 3 requests should succeed
      const res1 = await app.handle(createRequest("/test", { headers: { "x-forwarded-for": "1.1.1.1" } }));
      expect(res1.status).toBe(200);

      const res2 = await app.handle(createRequest("/test", { headers: { "x-forwarded-for": "1.1.1.1" } }));
      expect(res2.status).toBe(200);

      const res3 = await app.handle(createRequest("/test", { headers: { "x-forwarded-for": "1.1.1.1" } }));
      expect(res3.status).toBe(200);

      // 4th request should be rate limited
      const res4 = await app.handle(createRequest("/test", { headers: { "x-forwarded-for": "1.1.1.1" } }));
      expect(res4.status).toBe(429);
      expect(await res4.json()).toEqual({ error: "Rate limit exceeded" });
    });

    test("should handle caching middleware", async () => {
      const cache = new Map<string, Response>();
      let handlerCalls = 0;

      app.register(
        middleware(async (ctx, next) => {
          const cacheKey = `${ctx.request.method}:${ctx.request.url}`;
          const cached = cache.get(cacheKey);

          if (cached) {
            return cached.clone() as Response;
          }

          const response = await next();
          cache.set(cacheKey, response.clone() as Response);
          return response;
        })
      );

      app.get("/test", () => {
        handlerCalls++;
        return { success: true, timestamp: Date.now() };
      });

      // First request - should hit handler
      const res1 = await app.handle(createRequest("/test"));
      expect(res1.status).toBe(200);
      expect(handlerCalls).toBe(1);

      // Second request - should use cache
      const res2 = await app.handle(createRequest("/test"));
      expect(res2.status).toBe(200);
      expect(handlerCalls).toBe(1); // Handler not called again

      // Different route - should hit handler
      app.get("/other", () => {
        handlerCalls++;
        return { success: true };
      });

      const res3 = await app.handle(createRequest("/other"));
      expect(res3.status).toBe(200);
      expect(handlerCalls).toBe(2);
    });

    test("should handle request validation middleware", async () => {
      app.register(
        middleware(async (ctx, next) => {
          if (ctx.request.method === "POST") {
            const contentType = ctx.request.headers.get("content-type");
            if (!contentType?.includes("application/json")) {
              return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
                status: 400,
                headers: { "content-type": "application/json" },
              });
            }
          }
          return next();
        })
      );

      app.post("/test", () => ({ success: true }));

      // POST without proper content-type
      const res1 = await app.handle(createRequest("/test", { method: "POST" }));
      expect(res1.status).toBe(400);

      // POST with proper content-type
      const res2 = await app.handle(
        createRequest("/test", {
          method: "POST",
          headers: { "content-type": "application/json" },
        })
      );
      expect(res2.status).toBe(200);
    });

    test("should handle compression simulation middleware", async () => {
      app.register(
        middleware(async (ctx, next) => {
          const response = await next();
          const headers = new Headers(response.headers);

          // Simulate compression by setting header
          if (ctx.request.headers.get("accept-encoding")?.includes("gzip")) {
            headers.set("content-encoding", "gzip");
          }

          return new Response(response.body, {
            status: response.status,
            headers,
          });
        })
      );

      app.get("/test", () => ({ data: "test data" }));

      const response = await app.handle(
        createRequest("/test", {
          headers: { "accept-encoding": "gzip, deflate" },
        })
      );

      expect(response.headers.get("content-encoding")).toBe("gzip");
    });
  });

  describe("middleware registration order", () => {
    test("should respect order when registering middlewares separately", async () => {
      const order: string[] = [];

      app.register(
        middleware(async (_ctx, next) => {
          order.push("first");
          return next();
        })
      );

      app.register(
        middleware(async (_ctx, next) => {
          order.push("second");
          return next();
        })
      );

      app.register(
        middleware(async (_ctx, next) => {
          order.push("third");
          return next();
        })
      );

      app.get("/test", () => {
        order.push("handler");
        return { success: true };
      });

      await app.handle(createRequest("/test"));

      expect(order).toEqual(["first", "second", "third", "handler"]);
    });

    test("should respect order when registering middlewares together", async () => {
      const order: string[] = [];

      app.register(
        middleware(
          async (_ctx, next) => {
            order.push("first");
            return next();
          },
          async (_ctx, next) => {
            order.push("second");
            return next();
          },
          async (_ctx, next) => {
            order.push("third");
            return next();
          }
        )
      );

      app.get("/test", () => {
        order.push("handler");
        return { success: true };
      });

      await app.handle(createRequest("/test"));

      expect(order).toEqual(["first", "second", "third", "handler"]);
    });

    test("should maintain order across mixed registration patterns", async () => {
      const order: string[] = [];

      app.register(
        middleware(async (_ctx, next) => {
          order.push("first");
          return next();
        })
      );

      app.register(
        middleware(
          async (_ctx, next) => {
            order.push("second");
            return next();
          },
          async (_ctx, next) => {
            order.push("third");
            return next();
          }
        )
      );

      app.register(
        middleware(async (_ctx, next) => {
          order.push("fourth");
          return next();
        })
      );

      app.get("/test", () => {
        order.push("handler");
        return { success: true };
      });

      await app.handle(createRequest("/test"));

      expect(order).toEqual(["first", "second", "third", "fourth", "handler"]);
    });
  });

  describe("error propagation", () => {
    test("should allow middleware to catch errors from handler", async () => {
      const executionLog: string[] = [];
      let caughtError: Error | null = null;

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("middleware-before");
          try {
            return await next();
          } catch (error) {
            executionLog.push("middleware-caught-error");
            caughtError = error as Error;
            // Return a custom error response
            return new Response(JSON.stringify({ error: "Caught by middleware" }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }
        })
      );

      app.get("/test", () => {
        executionLog.push("handler-throwing");
        throw new Error("Handler error");
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Caught by middleware" });
      expect(executionLog).toEqual(["middleware-before", "handler-throwing", "middleware-caught-error"]);
      expect(caughtError).toBeInstanceOf(Error);
      expect(caughtError!.message).toBe("Handler error");
    });

    test("should allow middleware to catch and rethrow errors", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("outer-middleware-before");
          try {
            return await next();
          } catch (error) {
            executionLog.push("outer-middleware-caught");
            throw error; // Rethrow to let default error handler process it
          }
        })
      );

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("inner-middleware-before");
          return next();
        })
      );

      app.get("/test", () => {
        executionLog.push("handler-throwing");
        throw new Error("Handler error");
      });

      const response = await app.handle(createRequest("/test"));

      // Default error handler should return 500
      expect(response.status).toBe(500);
      expect(executionLog).toEqual([
        "outer-middleware-before",
        "inner-middleware-before",
        "handler-throwing",
        "outer-middleware-caught",
      ]);
    });

    test("should propagate errors through nested middlewares", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("m1-before");
          try {
            const response = await next();
            executionLog.push("m1-after");
            return response;
          } catch (error) {
            executionLog.push("m1-caught");
            throw error;
          }
        })
      );

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("m2-before");
          try {
            const response = await next();
            executionLog.push("m2-after");
            return response;
          } catch (error) {
            executionLog.push("m2-caught");
            throw error;
          }
        })
      );

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("m3-before");
          try {
            const response = await next();
            executionLog.push("m3-after");
            return response;
          } catch (error) {
            executionLog.push("m3-caught");
            throw error;
          }
        })
      );

      app.get("/test", () => {
        executionLog.push("handler-throwing");
        throw new Error("Handler error");
      });

      await app.handle(createRequest("/test"));

      // Error should propagate through all middlewares in reverse order
      expect(executionLog).toEqual([
        "m1-before",
        "m2-before",
        "m3-before",
        "handler-throwing",
        "m3-caught",
        "m2-caught",
        "m1-caught",
      ]);
    });

    test("should allow middleware to transform errors into responses", async () => {
      app.register(
        middleware(async (_ctx, next) => {
          try {
            return await next();
          } catch (error) {
            const err = error as Error;
            return new Response(
              JSON.stringify({
                error: err.message,
                type: err.name,
              }),
              {
                status: 400,
                headers: { "content-type": "application/json" },
              }
            );
          }
        })
      );

      app.get("/test", () => {
        const error = new Error("Validation failed");
        error.name = "ValidationError";
        throw error;
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toEqual({
        error: "Validation failed",
        type: "ValidationError",
      });
    });

    test("should work with APM-style error tracking in middleware", async () => {
      const apmLog: Array<{ type: string; error?: string }> = [];

      app.register(
        middleware(async (_ctx, next) => {
          apmLog.push({ type: "transaction-start" });
          try {
            const response = await next();
            apmLog.push({ type: "transaction-success" });
            return response;
          } catch (error) {
            apmLog.push({ type: "transaction-error", error: (error as Error).message });
            throw error; // Rethrow to let error handler process it
          }
        })
      );

      // Test successful request
      app.get("/success", () => ({ success: true }));
      await app.handle(createRequest("/success"));

      expect(apmLog).toEqual([{ type: "transaction-start" }, { type: "transaction-success" }]);

      // Reset log
      apmLog.length = 0;

      // Test failed request
      app.get("/error", () => {
        throw new Error("Something went wrong");
      });
      await app.handle(createRequest("/error"));

      expect(apmLog).toEqual([{ type: "transaction-start" }, { type: "transaction-error", error: "Something went wrong" }]);
    });

    test("should handle errors thrown by middleware itself", async () => {
      const executionLog: string[] = [];

      app.register(
        middleware(async (_ctx, next) => {
          executionLog.push("outer-before");
          try {
            return await next();
          } catch (error) {
            executionLog.push("outer-caught: " + (error as Error).message);
            return new Response(JSON.stringify({ error: "Handled" }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }
        })
      );

      app.register(
        middleware(async (_ctx, _next) => {
          executionLog.push("inner-throwing");
          throw new Error("Middleware error");
        })
      );

      app.get("/test", () => {
        executionLog.push("handler");
        return { success: true };
      });

      const response = await app.handle(createRequest("/test"));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({ error: "Handled" });
      expect(executionLog).toEqual(["outer-before", "inner-throwing", "outer-caught: Middleware error"]);
    });
  });
});
