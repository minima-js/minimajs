import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { createApp } from "../../bun/index.js";
import type { App } from "../../interfaces/app.js";
import { bodyParser } from "./index.js";
import { body } from "../../http.js";
import { createRequest } from "../../mock/request.js";

describe("bodyParser", () => {
  let app: App;

  beforeEach(() => {
    app = createApp({ moduleDiscovery: false, logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  describe("default behavior", () => {
    test("should parse JSON body by default (registered automatically)", async () => {
      app.post("/test", () => {
        const data = body<{ name: string; age: number }>();
        return { received: data };
      });

      const req = createRequest("/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { name: "John", age: 30 },
      });

      const response = await app.handle(req);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({
        received: { name: "John", age: 30 },
      });
    });

    test("should handle content-type with charset", async () => {
      app.post("/test", () => {
        const data = body<{ test: string }>();
        return data;
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ test: "value" }),
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ test: "value" });
    });
  });

  describe("JSON parsing", () => {
    test("should parse JSON with explicit type option", async () => {
      app.register(bodyParser({ type: "json" }));

      app.post("/test", () => {
        const data = body<{ message: string }>();
        return data;
      });

      const req = createRequest("/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { message: "hello" },
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ message: "hello" });
    });

    test("should return null for invalid JSON", async () => {
      app.post("/test", () => {
        const data = body();
        return { data };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "invalid json{",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ data: null });
    });

    test("should not parse JSON without content-type header", async () => {
      app.post("/test", () => {
        const data = body();
        return { data };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        body: JSON.stringify({ test: "data" }),
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ data: null });
    });
  });

  describe("text parsing", () => {
    test("should parse text body", async () => {
      app.register(bodyParser({ type: "text" }));

      app.post("/test", () => {
        const data = body<string>();
        return { text: data };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "Hello World",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ text: "Hello World" });
    });

    test("should parse text/html", async () => {
      app.register(bodyParser({ type: "text" }));

      app.post("/test", () => {
        const data = body<string>();
        return { html: data };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "text/html" },
        body: "<h1>Title</h1>",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ html: "<h1>Title</h1>" });
    });

    test("should not parse non-text content types", async () => {
      app.register(bodyParser({ type: "text" }));

      app.post("/test", () => {
        const data = body();
        return { data };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "some text",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ data: null });
    });
  });

  describe("form parsing", () => {
    test("should parse form data with deprecation warning", async () => {
      const consoleWarnSpy = jest.spyOn(app.log, "warn").mockImplementation(() => {});

      app.register(bodyParser({ type: "form" }));

      app.post("/test", () => {
        const data = body<FormData>();
        return { hasData: data !== null };
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("[bodyParser] The 'form' type is deprecated"));

      consoleWarnSpy.mockRestore();
    });

    test("should parse application/x-www-form-urlencoded", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      app.register(bodyParser({ type: "form" }));

      app.post("/test", () => {
        const data = body<FormData>();
        return { hasData: data !== null };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "name=John&age=30",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ hasData: true });

      consoleWarnSpy.mockRestore();
    });
  });

  describe("arrayBuffer parsing", () => {
    test("should parse as arrayBuffer", async () => {
      app.register(bodyParser({ type: "arrayBuffer" }));

      app.post("/test", () => {
        const data = body<ArrayBuffer>();
        return { length: data ? data.byteLength : 0 };
      });

      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: testData,
      });

      const response = await app.handle(req);
      const json = (await response.json()) as { length: number };

      expect(json.length).toBeGreaterThan(0);
    });
  });

  describe("blob parsing", () => {
    test("should parse as blob", async () => {
      app.register(bodyParser({ type: "blob" }));

      app.post("/test", () => {
        const data = body<Blob>();
        return { hasBlob: data !== null, size: data?.size || 0 };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: "test data",
      });

      const response = await app.handle(req);
      const json = (await response.json()) as { hasBlob: boolean; size: number };

      expect(json.hasBlob).toBe(true);
      expect(json.size).toBeGreaterThan(0);
    });
  });

  describe("multiple types", () => {
    test("should support all types", async () => {
      app.register(bodyParser({ type: ["json", "text", "arrayBuffer", "blob"] }));

      app.post("/test", () => {
        const data = body();
        return { hasData: data !== null };
      });

      const req = createRequest("/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { test: true },
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ hasData: true });
    });
  });

  describe("clone option", () => {
    test("should clone request when clone option is true", async () => {
      app.register(bodyParser({ type: "json", clone: true }));

      app.post("/test", () => {
        const data = body<{ value: string }>();
        return data;
      });

      const req = createRequest("/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { value: "cloned" },
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ value: "cloned" });
    });
  });

  describe("override behavior", () => {
    test("should override default configuration when re-registered", async () => {
      // Default is JSON, override to text
      app.register(bodyParser({ type: "text" }));

      app.post("/test", () => {
        const data = body<string>();
        return { text: data };
      });

      const jsonReq = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "value" }),
      });

      const textReq = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "plain text",
      });

      const jsonResponse = await app.handle(jsonReq);
      const textResponse = await app.handle(textReq);

      // JSON should not be parsed (text parser doesn't handle JSON)
      expect(await jsonResponse.json()).toEqual({ text: null });
      // Text should be parsed
      expect(await textResponse.json()).toEqual({ text: "plain text" });
    });

    test("should override with multiple types", async () => {
      // Override default to support both JSON and text
      app.register(bodyParser({ type: ["json", "text"] }));

      app.post("/json", () => {
        const data = body<{ test: string }>();
        return data;
      });

      app.post("/text", () => {
        const data = body<string>();
        return { text: data };
      });

      const jsonReq = createRequest("/json", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { test: "value" },
      });

      const textReq = new Request("http://localhost/text", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "plain text",
      });

      const jsonResponse = await app.handle(jsonReq);
      const textResponse = await app.handle(textReq);

      expect(await jsonResponse.json()).toEqual({ test: "value" });
      expect(await textResponse.json()).toEqual({ text: "plain text" });
    });
  });

  describe("disable behavior", () => {
    test("should disable body parser when enabled is false", async () => {
      app.register(bodyParser({ enabled: false }));

      app.post("/test", () => {
        const data = body();
        return { data };
      });

      const req = createRequest("/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { test: "value" },
      });

      // Should return error response because bodyParser is not registered
      const response = await app.handle(req);
      expect(response.status).toBe(500);
      const json = (await response.json()) as { message: string };
      // Error is caught and converted to generic message by error handler
      expect(json.message).toBe("Unable to process request");
    });

    test("should allow re-enabling after disabling", async () => {
      // Disable first
      app.register(bodyParser({ enabled: false }));
      // Re-enable with text type
      app.register(bodyParser({ type: "text" }));

      app.post("/test", () => {
        const data = body<string>();
        return { text: data };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "Hello World",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ text: "Hello World" });
    });
  });

  describe("module isolation", () => {
    test("should override bodyParser only for child module without affecting root or siblings", async () => {
      // Root has default JSON bodyParser
      app.post("/root", () => {
        const data = body<{ root: string }>();
        return { parsed: data };
      });

      // Child module app2 overrides to text parser
      app.register(async (app2) => {
        app2.register(bodyParser({ type: "text" }));

        app2.post("/child2", () => {
          const data = body<string>();
          return { parsed: data };
        });
      });

      // Sibling module app3 should still use root's JSON parser
      app.register(async (app3) => {
        app3.post("/child3", () => {
          const data = body<{ sibling: string }>();
          return { parsed: data };
        });
      });

      // Root route should parse JSON
      const rootReq = createRequest("/root", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { root: "root-data" },
      });
      const rootResponse = await app.handle(rootReq);
      expect(await rootResponse.json()).toEqual({
        parsed: { root: "root-data" },
      });

      // Child2 route should parse text (overridden)
      const child2Req = new Request("http://localhost/child2", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "text-data",
      });
      const child2Response = await app.handle(child2Req);
      expect(await child2Response.json()).toEqual({
        parsed: "text-data",
      });

      // Child2 route should NOT parse JSON (text parser doesn't handle JSON)
      const child2JsonReq = new Request("http://localhost/child2", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "value" }),
      });
      const child2JsonResponse = await app.handle(child2JsonReq);
      expect(await child2JsonResponse.json()).toEqual({
        parsed: null,
      });

      // Child3 (sibling) route should parse JSON (uses root's parser)
      const child3Req = createRequest("/child3", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { sibling: "sibling-data" },
      });
      const child3Response = await app.handle(child3Req);
      expect(await child3Response.json()).toEqual({
        parsed: { sibling: "sibling-data" },
      });
    });
  });

  describe("edge cases", () => {
    test("should handle empty body", async () => {
      app.post("/test", () => {
        const data = body();
        return { data };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ data: null });
    });

    test("should handle missing type option", async () => {
      app.register(bodyParser({ type: undefined }));

      app.post("/test", () => {
        const data = body();
        return { data };
      });

      const req = createRequest("/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: { test: "value" },
      });

      const response = await app.handle(req);

      // Without type, no parsing should happen
      expect(await response.json()).toEqual({ data: null });
    });

    test("should return null when body parsing throws", async () => {
      app.post("/test", () => {
        const data = body();
        return { isNull: data === null };
      });

      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{{{{ invalid",
      });

      const response = await app.handle(req);

      expect(await response.json()).toEqual({ isNull: true });
    });
  });
});
