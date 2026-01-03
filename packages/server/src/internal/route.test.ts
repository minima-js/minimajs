import { describe, test, expect } from "@jest/globals";
import { applyRoutePrefix, result2route } from "./route.js";
import type { RouteFindResult } from "../interfaces/route.js";
describe("internal/route", () => {
  const tag = Symbol("tag");

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
