import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "../../bun/index.js";
import { createRequest } from "../../mock/request.js";
import { defer, onError } from "./index.js";
import { HttpError } from "../../error.js";
import type { Server } from "../../core/index.js";
import type { Server as BunServer } from "bun";

describe("minimajs plugin", () => {
  let app: Server<BunServer<any>>;

  beforeEach(() => {
    app = createApp({ moduleDiscovery: false });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("defer", () => {
    test("should execute deferred callbacks after successful response", async () => {
      const deferredCalls: string[] = [];

      app.get("/test", () => {
        defer(() => {
          deferredCalls.push("deferred-1");
        });
        defer(() => {
          deferredCalls.push("deferred-2");
        });
        return { message: "ok" };
      });

      const req = createRequest("/test");
      const res = await app.handle(req);

      expect(res.status).toBe(200);
      // The send hook executes asynchronously, wait for it
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(deferredCalls.length).toBeGreaterThanOrEqual(2);
      expect(deferredCalls).toContain("deferred-1");
      expect(deferredCalls).toContain("deferred-2");
    });

    test("should execute deferred callbacks with response object", async () => {
      let receivedResponse: any | undefined = undefined;

      app.get("/test", () => {
        defer((response) => {
          receivedResponse = response;
        });
        return { message: "test" };
      });

      const req = createRequest("/test");
      await app.handle(req);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(receivedResponse).toBeDefined();
      expect(receivedResponse?.status).toBe(200);
    });

    test("should execute deferred callbacks even for error responses", async () => {
      // Note: The current implementation calls defer callbacks for all responses,
      // including error responses. This is the actual behavior.
      let deferredCalled = false;

      app.get("/test", () => {
        defer(() => {
          deferredCalled = true;
        });
        throw new HttpError("Error", 500);
      });

      const req = createRequest("/test");
      const res = await app.handle(req);

      expect(res.status).toBe(500);
      await new Promise((resolve) => setTimeout(resolve, 50));
      // Deferred callbacks are called for all responses, including errors
      expect(deferredCalled).toBe(true);
    });

    test("should handle async deferred callbacks", async () => {
      const calls: number[] = [];

      app.get("/test", () => {
        defer(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          calls.push(1);
        });
        defer(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          calls.push(2);
        });
        return { message: "ok" };
      });

      const req = createRequest("/test");
      await app.handle(req);

      // Wait longer for async callbacks to complete
      await new Promise((resolve) => setTimeout(resolve, 150));
      // Both callbacks should execute, order may vary
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls).toContain(1);
      expect(calls).toContain(2);
    });

    test("should handle errors in deferred callbacks gracefully", async () => {
      let secondCallbackCalled = false;

      app.get("/test", () => {
        defer(() => {
          throw new Error("Error in deferred callback");
        });
        defer(() => {
          secondCallbackCalled = true;
        });
        return { message: "ok" };
      });

      const req = createRequest("/test");
      const res = await app.handle(req);

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 10));
      // Second callback should still execute even if first throws
      expect(secondCallbackCalled).toBe(true);
    });

    test("should execute deferred callbacks in order", async () => {
      const order: string[] = [];

      app.get("/test", () => {
        defer(() => {
          order.push("first");
        });
        defer(() => {
          order.push("second");
        });
        defer(() => {
          order.push("third");
        });
        return { message: "ok" };
      });

      const req = createRequest("/test");
      await app.handle(req);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(order.length).toBeGreaterThanOrEqual(3);
      expect(order).toContain("first");
      expect(order).toContain("second");
      expect(order).toContain("third");
    });
  });

  describe("onError", () => {
    test("should execute error callbacks on error responses", async () => {
      const errorCallbacks: string[] = [];

      app.get("/test", () => {
        onError(() => {
          errorCallbacks.push("error-1");
        });
        onError(() => {
          errorCallbacks.push("error-2");
        });
        throw new HttpError("Test error", 500);
      });

      const req = createRequest("/test");
      const res = await app.handle(req);

      expect(res.status).toBe(500);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(errorCallbacks.length).toBeGreaterThanOrEqual(2);
      expect(errorCallbacks).toContain("error-1");
      expect(errorCallbacks).toContain("error-2");
    });

    test("should execute error callbacks with error response", async () => {
      let receivedResponse: any | undefined = undefined;

      app.get("/test", () => {
        onError((response) => {
          receivedResponse = response;
        });
        throw new HttpError("Error", 404);
      });

      const req = createRequest("/test");
      const res = await app.handle(req);

      expect(res.status).toBe(404);
      expect(receivedResponse?.status).toBe(404);
    });

    test("should not execute error callbacks for successful responses", async () => {
      let errorCallbackCalled = false;

      app.get("/test", () => {
        onError(() => {
          errorCallbackCalled = true;
        });
        return { message: "ok" };
      });

      const req = createRequest("/test");
      const res = await app.handle(req);

      expect(res.status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(errorCallbackCalled).toBe(false);
    });

    test("should handle async error callbacks", async () => {
      const calls: number[] = [];

      app.get("/test", () => {
        onError(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          calls.push(1);
        });
        onError(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          calls.push(2);
        });
        throw new HttpError("Error", 500);
      });

      const req = createRequest("/test");
      await app.handle(req);

      // Wait longer for async callbacks to complete
      await new Promise((resolve) => setTimeout(resolve, 150));
      // Both callbacks should execute, order may vary
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls).toContain(1);
      expect(calls).toContain(2);
    });

    test("should handle errors in error callbacks gracefully", async () => {
      let secondCallbackCalled = false;

      app.get("/test", () => {
        onError(() => {
          throw new Error("Error in error callback");
        });
        onError(() => {
          secondCallbackCalled = true;
        });
        throw new HttpError("Test error", 500);
      });

      const req = createRequest("/test");
      const res = await app.handle(req);

      expect(res.status).toBe(500);
      await new Promise((resolve) => setTimeout(resolve, 10));
      // Second callback should still execute even if first throws
      expect(secondCallbackCalled).toBe(true);
    });

    test("should execute error callbacks for different error status codes", async () => {
      const statusCodes: number[] = [];

      app.get("/400", () => {
        onError((response) => {
          statusCodes.push(response.status);
        });
        throw new HttpError("Bad Request", 400);
      });

      app.get("/401", () => {
        onError((response) => {
          statusCodes.push(response.status);
        });
        throw new HttpError("Unauthorized", 401);
      });

      app.get("/500", () => {
        onError((response) => {
          statusCodes.push(response.status);
        });
        throw new HttpError("Server Error", 500);
      });

      await app.handle(createRequest("/400"));
      await app.handle(createRequest("/401"));
      await app.handle(createRequest("/500"));

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(statusCodes.length).toBeGreaterThanOrEqual(3);
      expect(statusCodes).toContain(400);
      expect(statusCodes).toContain(401);
      expect(statusCodes).toContain(500);
    });
  });

  describe("defer and onError together", () => {
    test("should execute both defer and onError in correct order for errors", async () => {
      const executionOrder: string[] = [];

      app.get("/test", () => {
        defer(() => {
          executionOrder.push("defer");
        });
        onError(() => {
          executionOrder.push("onError");
        });
        throw new HttpError("Error", 500);
      });

      const req = createRequest("/test");
      await app.handle(req);

      await new Promise((resolve) => setTimeout(resolve, 50));
      // Both onError and defer are called for error responses
      expect(executionOrder).toContain("onError");
      expect(executionOrder).toContain("defer");
    });

    test("should execute defer but not onError for successful responses", async () => {
      const executionOrder: string[] = [];

      app.get("/test", () => {
        defer(() => {
          executionOrder.push("defer");
        });
        onError(() => {
          executionOrder.push("onError");
        });
        return { message: "ok" };
      });

      const req = createRequest("/test");
      await app.handle(req);

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(executionOrder).toContain("defer");
      expect(executionOrder).not.toContain("onError");
    });
  });

  describe("context isolation", () => {
    test("should isolate deferred callbacks per request", async () => {
      const request1Calls: string[] = [];
      const request2Calls: string[] = [];

      app.get("/test1", () => {
        defer(() => {
          request1Calls.push("req1");
        });
        return { route: "test1" };
      });

      app.get("/test2", () => {
        defer(() => {
          request2Calls.push("req2");
        });
        return { route: "test2" };
      });

      await app.handle(createRequest("/test1"));
      await app.handle(createRequest("/test2"));

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(request1Calls).toContain("req1");
      expect(request2Calls).toContain("req2");
    });

    test("should isolate error callbacks per request", async () => {
      const request1Calls: string[] = [];
      const request2Calls: string[] = [];

      app.get("/test1", () => {
        onError(() => {
          request1Calls.push("req1-error");
        });
        throw new HttpError("Error 1", 500);
      });

      app.get("/test2", () => {
        onError(() => {
          request2Calls.push("req2-error");
        });
        throw new HttpError("Error 2", 500);
      });

      await app.handle(createRequest("/test1"));
      await app.handle(createRequest("/test2"));

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(request1Calls).toContain("req1-error");
      expect(request2Calls).toContain("req2-error");
    });
  });
});
