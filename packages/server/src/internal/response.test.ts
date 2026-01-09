import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { type App } from "../interfaces/app.js";
import { createApp } from "../bun/index.js";
import { createRequest } from "../mock/request.js";

describe("internal/response", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app.close());

  describe("handleResponse", () => {
    test("plain string response", async () => {
      app.get("/", () => {
        return "hello world";
      });
      const response = await app.handle(createRequest("/"));
      expect(await response.text()).toBe("hello world");
    });

    test("plain object synchronous response", async () => {
      app.get("/", () => {
        return { message: "hello world" };
      });
      const response = await app.handle(createRequest("/"));
      expect(await response.text()).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async  response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.handle(createRequest("/"));
      expect(await response.text()).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async synchronous response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.handle(createRequest("/"));
      expect(await response.text()).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("async iterator response with error", async () => {
      async function* generator() {
        yield "hello";
        yield " ";
        throw new Error("test");
      }
      app.get("/", () => {
        return generator();
      });
      try {
        await app.handle(createRequest("/"));
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
  });

  describe("createResponse", () => {
    test("should return data as-is if it's already a Response object", async () => {
      app.get("/response-obj", () => {
        return new Response("Hello from Response object");
      });

      const res = await app.handle(createRequest("/response-obj"));
      expect(await res.text()).toBe("Hello from Response object");
      expect(res.status).toBe(200);
    });

    test("should use Response from send hook if provided", async () => {
      const { hook } = await import("../hooks/index.js");

      const originalBody = "Original body content";
      const customResponse = new Response("Intercepted by send hook", { status: 202 });

      app.register(
        hook("send", async (_body, _ctx) => {
          return customResponse;
        })
      );

      app.get("/test-path", () => originalBody);

      // Mock a context to call createResponse directly
      const response = await app.handle(createRequest("/test-path"));

      // After context is mocked and createResponse is called, assert on the response
      expect(response).toEqual(customResponse); // Expect the send hook's response
      expect(await response?.text()).toBe("Intercepted by send hook");
      expect(response?.status).toBe(202);
    });

    test("should merge headers from options", async () => {
      // Import createResponse directly
      const { createResponse } = await import("./response.js");
      app.get("/test-headers", (ctx) => {
        return createResponse(
          "OK",
          {
            headers: { "X-Custom-Header": "TestValue" },
          },
          ctx
        );
      });
      const response = await app.handle(createRequest("/test-headers"));
      expect(response?.headers.get("X-Custom-Header")).toBe("TestValue");
    });
  });
});
