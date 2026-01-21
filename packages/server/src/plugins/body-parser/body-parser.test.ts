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

  describe("JSON parsing", () => {
    test("should parse JSON body by default", async () => {
      app.register(bodyParser());

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
      app.register(bodyParser({ type: "json" }));

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
      app.register(bodyParser({ type: "json" }));

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

    test("should handle content-type with charset", async () => {
      app.register(bodyParser({ type: "json" }));

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
    test("should support multiple content types", async () => {
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

  describe("edge cases", () => {
    test("should handle empty body", async () => {
      app.register(bodyParser({ type: "json" }));

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
      app.register(bodyParser({ type: "json" }));

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
