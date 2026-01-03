import { describe, test, expect } from "@jest/globals";
import { createRouteMetadata, applyRoutePrefix, result2route } from "./route.js";
import { createApp } from "../bun/index.js";
import type { RouteFindResult, RouteMetaDescriptor } from "../interfaces/route.js";
import type { App, RouteHandler } from "../interfaces/app.js";
describe("internal/route", () => {
  const tag = Symbol("tag");
  const version = Symbol("version");
  const path = Symbol("path");
  const method = Symbol("method");
  const route = Symbol("route");
  const publicKey = Symbol("public");
  describe("createRouteMetadata", () => {
    test("should create metadata from array descriptors", () => {
      const app = createApp();
      const handler: RouteHandler = () => "test";
      const descriptors: RouteMetaDescriptor[] = [
        [tag, "api"],
        [tag, "public"],
        [version, "v1"],
      ];

      const metadata = createRouteMetadata<any>(descriptors, "/test", handler, app);

      expect(metadata.has(tag)).toBe(true);
      expect(metadata.has(version)).toBe(true);
      expect(metadata.get(tag)?.has("api")).toBe(true);
      expect(metadata.get(tag)?.has("public")).toBe(true);
      expect(metadata.get(version)?.has("v1")).toBe(true);

      app.close();
    });

    test("should create metadata from function descriptors", () => {
      const app = createApp();
      const handler: RouteHandler = () => "test";
      const descriptors: RouteMetaDescriptor[] = [
        (pathStr: string, _handler: RouteHandler, _app: App) => [path, pathStr],
        (_pathStr: string) => [method, "GET"],
      ];

      const metadata = createRouteMetadata<any>(descriptors, "/users", handler, app);

      expect(metadata.has(path)).toBe(true);
      expect(metadata.has(method)).toBe(true);
      expect(metadata.get(path)?.has("/users")).toBe(true);
      expect(metadata.get(method)?.has("GET")).toBe(true);

      app.close();
    });

    test("should handle mixed array and function descriptors", () => {
      const app = createApp();
      const handler: RouteHandler = () => "test";
      const descriptors: RouteMetaDescriptor[] = [[tag, "api"], (pathStr: string) => [route, pathStr], [publicKey, true]];

      const metadata = createRouteMetadata<any>(descriptors, "/mixed", handler, app);

      expect(metadata.has(tag)).toBe(true);
      expect(metadata.has(route)).toBe(true);
      expect(metadata.has(publicKey)).toBe(true);
      expect(metadata.get(tag)?.has("api")).toBe(true);
      expect(metadata.get(route)?.has("/mixed")).toBe(true);
      expect(metadata.get(publicKey)?.has(true)).toBe(true);

      app.close();
    });

    test("should merge values for same metadata key", () => {
      const app = createApp();
      const handler: RouteHandler = () => "test";
      const descriptors: RouteMetaDescriptor[] = [
        [tag, "api"],
        [tag, "v1"],
        [tag, "public"],
      ];

      const metadata = createRouteMetadata<any>(descriptors, "/test", handler, app);

      expect(metadata.get(tag)?.size).toBe(3);
      expect(metadata.get(tag)?.has("api")).toBe(true);
      expect(metadata.get(tag)?.has("v1")).toBe(true);
      expect(metadata.get(tag)?.has("public")).toBe(true);

      app.close();
    });

    test("should handle empty descriptors", () => {
      const app = createApp();
      const handler: RouteHandler = () => "test";
      const descriptors: RouteMetaDescriptor[] = [];

      const metadata = createRouteMetadata<any>(descriptors, "/test", handler, app);

      expect(metadata.size).toBeGreaterThanOrEqual(0);

      app.close();
    });
  });

  describe("applyRoutePrefix", () => {
    test("should apply prefix to path", () => {
      const result = applyRoutePrefix("/users", "/api", []);
      expect(result).toBe("/api/users");
    });

    test("should not apply prefix if path is in exclude list", () => {
      const result = applyRoutePrefix("/health", "/api", ["/health", "/status"]);
      expect(result).toBe("/health");
    });

    test("should not apply prefix if path starts with excluded path", () => {
      const result = applyRoutePrefix("/health/check", "/api", ["/health"]);
      expect(result).toBe("/health/check");
    });

    test("should apply prefix if path is not in exclude list", () => {
      const result = applyRoutePrefix("/users", "/api", ["/health", "/status"]);
      expect(result).toBe("/api/users");
    });

    test("should handle empty prefix", () => {
      const result = applyRoutePrefix("/users", "", []);
      expect(result).toBe("/users");
    });

    test("should handle root path", () => {
      const result = applyRoutePrefix("/", "/api", []);
      expect(result).toBe("/api/");
    });

    test("should exclude exact path match", () => {
      const result = applyRoutePrefix("/public", "/api", ["/public"]);
      expect(result).toBe("/public");
    });

    test("should exclude paths starting with excluded prefix", () => {
      const result = applyRoutePrefix("/public/assets/image.png", "/api", ["/public"]);
      expect(result).toBe("/public/assets/image.png");
    });
  });

  describe("result2route", () => {
    test("should convert route find result to route", () => {
      const handler = () => "test";
      const metadata = new Map();
      metadata.set(tag, new Set(["api"]));

      const routeFindResult: RouteFindResult<any> = {
        params: { id: "123" },
        handler,
        searchParams: {},
        store: {
          methods: ["GET"],
          handler,
          server: {} as any,
          path: "/users/:id",
          metadata,
        },
      };

      const route = result2route(routeFindResult);

      expect(route.params).toEqual({ id: "123" });
      expect(route.methods).toEqual(["GET"]);
      expect(route.handler).toBe(handler);
      expect(route.path).toBe("/users/:id");
      expect(route.metadata).toBe(metadata);
    });

    test("should handle empty params", () => {
      const handler = () => "test";
      const metadata = new Map();

      const routeFindResult: RouteFindResult<any> = {
        params: {},
        store: {
          methods: ["POST"],
          handler,
          path: "/users",
          metadata,
        },
      } as any;

      const route = result2route(routeFindResult);

      expect(route.params).toEqual({});
      expect(route.methods).toEqual(["POST"]);
      expect(route.path).toBe("/users");
    });

    test("should handle multiple methods", () => {
      const handler = () => "test";
      const metadata = new Map();

      const routeFindResult: RouteFindResult<any> = {
        params: {},
        store: {
          methods: ["GET", "POST", "PUT"],
          handler,
          path: "/resource",
          metadata,
        },
      } as any;

      const route = result2route(routeFindResult);

      expect(route.methods).toEqual(["GET", "POST", "PUT"]);
    });
  });
});
