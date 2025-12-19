import { createApp } from "./index.js";
import { mixin, createLogger } from "./logger.js";

describe("Logger", () => {
  describe("mixin function", () => {
    it("should return data with module name if present", async () => {
      const app = createApp({ routes: { log: false } });
      app.get("/", function homePage() {
        const result = mixin({});
        expect(result).toEqual({ name: "fastify:homePage" });
        return "done";
      });
      await app.inject({ url: "/" });
      await app.close();
    });

    it("should not override existing name property", async () => {
      const app = createApp({ routes: { log: false } });
      app.get("/test", function testRoute() {
        const result = mixin({ name: "custom-name" });
        expect(result).toEqual({ name: "custom-name" });
        return "done";
      });
      await app.inject({ url: "/test" });
      await app.close();
    });

    it("should return data as-is when no context available", () => {
      // Outside of request context
      const result = mixin({ foo: "bar" });
      expect(result).toEqual({ foo: "bar" });
    });

    it("should handle empty data object", async () => {
      const app = createApp({ routes: { log: false } });
      app.get("/empty", function emptyRoute() {
        const result = mixin({});
        expect(result).toHaveProperty("name");
        return "done";
      });
      await app.inject({ url: "/empty" });
      await app.close();
    });

    it("should preserve other properties in data", async () => {
      const app = createApp({ routes: { log: false } });
      app.get("/props", function propsRoute() {
        const result = mixin({ level: 30, msg: "test message", timestamp: Date.now() });
        expect(result).toHaveProperty("name");
        expect(result).toHaveProperty("level", 30);
        expect(result).toHaveProperty("msg", "test message");
        expect(result).toHaveProperty("timestamp");
        return "done";
      });
      await app.inject({ url: "/props" });
      await app.close();
    });

    it("should handle routes without plugin chain", async () => {
      const app = createApp({ routes: { log: false } });
      app.get("/no-plugin", function noPluginRoute() {
        const result = mixin({});
        // Should still work even if plugin chain is empty
        expect(result).toHaveProperty("name");
        return "done";
      });
      await app.inject({ url: "/no-plugin" });
      await app.close();
    });

    it("should handle nested route handlers", async () => {
      const app = createApp({ routes: { log: false } });
      app.register(async (instance) => {
        instance.get("/nested", function nestedRoute() {
          const result = mixin({});
          expect(result).toHaveProperty("name");
          return "done";
        });
      });
      await app.inject({ url: "/nested" });
      await app.close();
    });

    it("should cache module name in local context", async () => {
      const app = createApp({ routes: { log: false } });
      app.get("/cached", function cachedRoute() {
        // First call should set the cache
        const result1 = mixin({});
        // Second call should use cached value
        const result2 = mixin({ other: "data" });
        expect(result1.name).toBe(result2.name);
        return "done";
      });
      await app.inject({ url: "/cached" });
      await app.close();
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
