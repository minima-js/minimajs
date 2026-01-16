import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { createApp } from "../../node/index.js";
import type { Server } from "../../core/index.js";
import { express } from "./index.js";
import { createRequest } from "../../mock/request.js";
import { IncomingMessage, ServerResponse, type Server as NodeServer } from "node:http";

describe("express", () => {
  let app: Server<NodeServer>;
  const req = {} as IncomingMessage;
  const res = {} as ServerResponse;

  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  test("should execute middleware and pass req/res objects", async () => {
    let captured: [unknown, unknown] = [null, null];

    app.register(
      express((r1, r2, next) => {
        captured = [r1, r2];
        next();
      })
    );
    app.get("/test", () => ({ ok: true }));

    const response = await app.handle(createRequest("/test"), {
      incomingMessage: req,
      serverResponse: res,
    });

    expect(captured).toEqual([req, res]);
    expect(response.status).toBe(200);
  });

  test("should execute multiple middleware in order", async () => {
    const order: number[] = [];

    [1, 2, 3].forEach((n) => {
      app.register(
        express((_r1, _r2, next) => {
          order.push(n);
          next();
        })
      );
    });

    app.get("/test", () => ({}));
    await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });

    expect(order).toEqual([1, 2, 3]);
  });

  test("should handle errors passed to next()", async () => {
    app.register(express((_r1, _r2, next) => next(new Error("test"))));
    app.get("/test", () => ({ ok: true }));

    const response = await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });
    expect(response.status).toBe(500);
  });

  test("should handle thrown errors", async () => {
    app.register(
      express((_r1, _r2, _next) => {
        throw new Error("sync error");
      })
    );
    app.get("/test", () => ({ ok: true }));

    const response = await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });
    expect(response.status).toBe(500);
  });

  test("should not call route handler when error occurs", async () => {
    let called = false;

    app.register(express((_r1, _r2, next) => next(new Error())));
    app.get("/test", () => {
      called = true;
      return {};
    });

    await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });
    expect(called).toBe(false);
  });

  test("should allow middleware to modify request", async () => {
    const customReq = {} as any;

    app.register(
      express((r1: any, _r2, next) => {
        r1.custom = "value";
        next();
      })
    );
    app.get("/test", (ctx) => ({ custom: (ctx.incomingMessage as any).custom }));

    const response = await app.handle(createRequest("/test"), {
      incomingMessage: customReq,
      serverResponse: res,
    });

    expect(await response.json()).toEqual({ custom: "value" });
  });

  test("should allow middleware to modify response", async () => {
    const mockRes = { setHeader: jest.fn() } as unknown as ServerResponse;

    app.register(
      express((_r1, r2: any, next) => {
        r2.setHeader("X-Test", "header");
        next();
      })
    );
    app.get("/test", () => ({}));

    await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: mockRes });
    expect(mockRes.setHeader).toHaveBeenCalledWith("X-Test", "header");
  });

  test("should handle async middleware", async () => {
    let value = "";

    app.register(
      express(async (_r1, _r2, next) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        value = "async";
        next();
      })
    );
    app.get("/test", () => ({ value }));

    const response = await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });
    expect(await response.json()).toEqual({ value: "async" });
  });

  test("should stop chain if next() not called", async () => {
    let secondCalled = false;

    app.register(express((_r1, _r2, _next) => {}));
    app.register(
      express((_r1, _r2, next) => {
        secondCalled = true;
        next();
      })
    );
    app.get("/test", () => ({}));

    app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(secondCalled).toBe(false);
  });

  test("should work without context objects", async () => {
    let called = false;

    app.register(
      express((_r1, _r2, next) => {
        called = true;
        next();
      })
    );
    app.get("/test", () => ({}));

    await app.handle(createRequest("/test"));
    expect(called).toBe(true);
  });

  test("should handle next() called multiple times", async () => {
    let count = 0;

    app.register(
      express((_r1, _r2, next) => {
        count++;
        next();
        next();
      })
    );
    app.get("/test", () => ({}));

    await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });
    expect(count).toBe(1);
  });

  test("should handle next(null) as success", async () => {
    app.register(express((_r1, _r2, next) => next(null)));
    app.get("/test", () => ({ ok: true }));

    const response = await app.handle(createRequest("/test"), { incomingMessage: req, serverResponse: res });
    expect(response.status).toBe(200);
  });

  test("should work with different HTTP methods", async () => {
    let method = "";
    const postReq = { method: "POST" } as IncomingMessage;

    app.register(
      express((r1: any, _r2, next) => {
        method = r1.method;
        next();
      })
    );
    app.post("/test", () => ({ method }));

    await app.handle(new Request("http://localhost/test", { method: "POST" }), {
      incomingMessage: postReq,
      serverResponse: res,
    });

    expect(method).toBe("POST");
  });
});
