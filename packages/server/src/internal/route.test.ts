import { describe, test, expect } from "@jest/globals";
import { applyRoutePrefix, applyRouteMetadata, getAppRouteDescriptors, result2route } from "./route.js";
import type { RouteFindResult, RouteConfig, RouteMetaDescriptor, RouteMetadata } from "../interfaces/route.js";
import { kAppDescriptor } from "../symbols.js";
import type { App, Container } from "../interfaces/index.js";

describe("internal/route", () => {
  const tag = Symbol("tag");
  const myKey = Symbol("myKey");
  const funcKey = Symbol("funcKey");
  const appKey = Symbol("appKey");
  const routeKey = Symbol("routeKey");
  const key1 = Symbol("key1");
  const key2 = Symbol("key2");
  const key3 = Symbol("key3");

  describe("getAppRouteDescriptors", () => {
    test("should return route descriptors from container", () => {
      const descriptors = [[tag, "value"] as [symbol, string]];
      const container: Container = { [kAppDescriptor]: descriptors } as unknown as Container;

      const result = getAppRouteDescriptors(container);
      expect(result).toBe(descriptors);
    });
  });

  describe("applyRouteMetadata", () => {
    test("should apply array descriptor to metadata", () => {
      const metadata: RouteMetadata = {};
      const container: Container = { [kAppDescriptor]: [] } as unknown as Container;

      const routeConfig: RouteConfig<unknown> = {
        app: { container } as unknown as App,
        metadata,
        path: "/test",
        methods: ["GET"],
        handler: () => "test",
      };

      const arrayDescriptor: RouteMetaDescriptor<unknown> = [myKey, "myValue"];

      applyRouteMetadata(routeConfig, [arrayDescriptor]);

      expect(metadata[myKey]).toBe("myValue");
    });

    test("should apply function descriptor to route config", () => {
      const metadata: RouteMetadata = {};
      const container: Container = { [kAppDescriptor]: [] } as unknown as Container;

      const routeConfig: RouteConfig<unknown> = {
        app: { container } as unknown as App,
        metadata,
        path: "/test",
        methods: ["GET"],
        handler: () => "test",
      };

      const functionDescriptor: RouteMetaDescriptor<unknown> = (config) => {
        config.metadata[funcKey] = "funcValue";
      };

      applyRouteMetadata(routeConfig, [functionDescriptor]);

      expect(metadata[funcKey]).toBe("funcValue");
    });

    test("should apply both app-level and route-level descriptors", () => {
      const metadata: RouteMetadata = {};
      const container: Container = {} as any;
      const appDescriptor: RouteMetaDescriptor<unknown> = [appKey, "appValue"];
      container[kAppDescriptor] = [appDescriptor];

      const routeConfig: RouteConfig<unknown> = {
        app: { container } as unknown as App,
        metadata,
        path: "/test",
        methods: ["GET"],
        handler: () => "test",
      };

      const routeDescriptor: RouteMetaDescriptor<unknown> = [routeKey, "routeValue"];

      applyRouteMetadata(routeConfig, [routeDescriptor]);

      expect(metadata[appKey]).toBe("appValue");
      expect(metadata[routeKey]).toBe("routeValue");
    });

    test("should apply mixed array and function descriptors", () => {
      const metadata: RouteMetadata = {};
      const container: Container = { [kAppDescriptor]: [] } as unknown as Container;

      const routeConfig: RouteConfig<unknown> = {
        app: { container } as unknown as App,
        metadata,
        path: "/test",
        methods: ["GET"],
        handler: () => "test",
      };

      const descriptors: RouteMetaDescriptor<unknown>[] = [
        [key1, "value1"],
        (config) => {
          config.metadata[key2] = "value2";
        },
        [key3, "value3"],
      ];

      applyRouteMetadata(routeConfig, descriptors);

      expect(metadata[key1]).toBe("value1");
      expect(metadata[key2]).toBe("value2");
      expect(metadata[key3]).toBe("value3");
    });
  });

  describe("applyRoutePrefix", () => {
    test("should apply prefix to path", () => {
      const result = applyRoutePrefix("/users", "/api");
      expect(result).toBe("/api/users");
    });

    test("should not apply prefix if path is in exclude list", () => {
      const result = applyRoutePrefix("/health", "/api");
      expect(result).toBe("/api/health");
    });

    test("should handle empty prefix", () => {
      const result = applyRoutePrefix("/users", "");
      expect(result).toBe("/users");
    });

    test("should handle root path", () => {
      const result = applyRoutePrefix("/", "/api");
      expect(result).toBe("/api/");
    });
  });

  describe("result2route", () => {
    test("should convert route find result to route", () => {
      const handler = () => "test";
      const metadata: RouteMetadata = {};
      metadata[tag] = new Set(["api"]);

      const routeFindResult: RouteFindResult<any> = {
        params: { id: "123" },
        handler,
        searchParams: {},
        store: {
          methods: ["GET"],
          handler,
          app: {} as any,
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
