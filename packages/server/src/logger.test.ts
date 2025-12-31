import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "./bun/index.js";
import type { App } from "./interfaces/app.js";
import { mixin, createLogger } from "./logger.js";

describe("Logger", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app.close());

  describe("mixin function", () => {
    it("should return data with module name if present", async () => {
      app.get("/", function homePage() {
        const result = mixin({});
        expect(result).toEqual({ name: "fastify:homePage" });
        return "done";
      });
      await app.inject("/");
    });

    it("should not override existing name property", async () => {
      app.get("/test", function testRoute() {
        const result = mixin({ name: "custom-name" });
        expect(result).toEqual({ name: "custom-name" });
        return "done";
      });
      await app.inject("/test");
    });

    it("should return data as-is when no context available", () => {
      // Outside of request context
      const result = mixin({ foo: "bar" });
      expect(result).toEqual({ foo: "bar" });
    });

    it("should handle empty data object", async () => {
      app.get("/empty", function emptyRoute() {
        const result = mixin({});
        expect(result).toHaveProperty("name");
        return "done";
      });
      await app.inject("/empty");
    });

    it("should preserve other properties in data", async () => {
      app.get("/props", function propsRoute() {
        const result = mixin({ level: 30, msg: "test message", timestamp: Date.now() });
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("level", 30);
        expect(result).toHaveProperty("msg", "test message");
        expect(result).toHaveProperty("timestamp");
        return "done";
      });
      await app.inject("/props");
    });

    it("should handle routes without plugin chain (null/undefined)", async () => {
      const currentApp = createApp({ logger: false });
      (currentApp as any)[Symbol.for("fastify.plugin.nameChain")] = null;
      currentApp.get("/no-plugin-null", function noPluginRouteNull() {
        const result = mixin({});
        expect(result.name).toBe("");
        return "done";
      });
      await currentApp.inject("/no-plugin-null");
      await currentApp.close();
    });

    it("should handle routes without plugin chain (empty array)", async () => {
      const currentApp = createApp({ logger: false });
      (currentApp as any)[Symbol.for("fastify.plugin.nameChain")] = [];
      currentApp.get("/no-plugin-empty", function noPluginRouteEmpty() {
        const result = mixin({});
        expect(result.name).toBe("");
        return "done";
      });
      await currentApp.inject("/no-plugin-empty");
      await currentApp.close();
    });

    it("should handle routes without handler name", async () => {
      app.get("/no-handler", () => {
        const result = mixin({});
        expect(result).toHaveProperty("name");
        return "done";
      });
      await app.inject("/no-handler");
    });

    it("should handle nested route handlers", async () => {
      app.register(async (instance) => {
        instance.get("/nested", function nestedRoute() {
          const result = mixin({});
          expect(result).toHaveProperty("name");
          return "done";
        });
      });
      await app.inject("/nested");
    });

    it("should cache module name in local context", async () => {
      app.get("/cached", function cachedRoute() {
        // First call should set the cache
        const result1 = mixin({});
        // Second call should use cached value
        const result2 = mixin({ other: "data" });
        expect(result1.name).toBe(result2.name);
        return "done";
      });
      await app.inject("/cached");
    });
  });

  describe("createLogger", () => {
    it("should create logger with custom options", () => {
      const customLogger = createLogger({ level: "debug" });
      expect(customLogger).toBeDefined();
      expect(customLogger.level).toBe("debug");
    });

    it("should create logger with default mixin", () => {
      const customLogger = createLogger({});
      expect(customLogger).toBeDefined();
    });

    it("should merge options with defaults", () => {
      const customLogger = createLogger({
        level: "error",
        name: "custom-logger",
      });
      expect(customLogger).toBeDefined();
      expect(customLogger.level).toBe("error");
    });
  });
});
