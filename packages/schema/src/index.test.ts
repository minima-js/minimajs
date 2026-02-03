import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import { mockContext } from "@minimajs/server/mock";
import {
  createBody,
  createBodyAsync,
  createHeaders,
  createHeadersAsync,
  createSearchParams,
  createSearchParamsAsync,
  ValidationError,
} from "./index.js";

describe("index", () => {
  describe("createBody", () => {
    test("should validate body successfully", () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      mockContext(
        () => {
          const getBody = createBody(schema);
          const result = getBody();
          expect(result).toEqual({ name: "John", age: 30 });
        },
        { body: { name: "John", age: 30 } }
      );
    });

    test("should throw ValidationError for invalid body", () => {
      const schema = z.object({
        email: z.string().email(),
      });

      mockContext(
        () => {
          const getBody = createBody(schema);

          expect(() => getBody()).toThrow(ValidationError);
        },
        { body: { email: "invalid" } }
      );
    });

    test("should strip unknown fields by default", () => {
      const schema = z.object({
        name: z.string(),
      });

      mockContext(
        () => {
          const getBody = createBody(schema);
          const result = getBody();

          expect(result).toEqual({ name: "John" });
        },
        { body: { name: "John", extra: "field" } }
      );
    });

    test("should preserve unknown fields when stripUnknown is false", () => {
      const schema = z.object({
        name: z.string(),
      });

      mockContext(
        () => {
          const getBody = createBody(schema, { stripUnknown: false });
          const result = getBody();
          expect(result).toEqual({ name: "John", extra: "field" });
        },
        { body: { name: "John", extra: "field" } }
      );
    });
  });

  describe("createBodyAsync", () => {
    test("should validate body successfully", async () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      await mockContext(
        async () => {
          const getBody = createBodyAsync(schema);
          const result = await getBody();

          expect(result).toEqual({ name: "John", age: 30 });
        },
        { body: { name: "John", age: 30 } }
      );
    });

    test("should throw ValidationError for invalid body", async () => {
      const schema = z.object({
        email: z.string().email(),
      });

      await mockContext(
        async () => {
          const getBody = createBodyAsync(schema);

          await expect(getBody()).rejects.toThrow(ValidationError);
        },
        { body: { email: "invalid" } }
      );
    });
  });

  describe("createHeaders", () => {
    test("should validate headers successfully", () => {
      const schema = {
        "x-api-key": z.string(),
        "content-type": z.string(),
      };
      const getHeaders = createHeaders(schema);
      mockContext(
        () => {
          const result = getHeaders();
          expect(result["x-api-key"]).toBe("secret");
          expect(result["content-type"]).toBe("application/json");
        },
        {
          headers: {
            "x-api-key": "secret",
            "content-type": "application/json",
          },
        }
      );
    });

    test("should throw ValidationError for missing required header", () => {
      const schema = {
        "x-api-key": z.string(),
      };

      mockContext(() => {
        const getHeaders = createHeaders(schema);
        expect(() => getHeaders()).toThrow(ValidationError);
      });
    });

    test("should handle optional headers", () => {
      const schema = {
        "x-api-key": z.string().optional(),
      };

      mockContext(() => {
        const getHeaders = createHeaders(schema);
        const result = getHeaders();

        expect(result["x-api-key"]).toBeUndefined();
      });
    });
  });

  describe("createHeadersAsync", () => {
    test("should validate headers successfully", async () => {
      const schema = {
        "x-api-key": z.string(),
      };

      await mockContext(
        async () => {
          const getHeaders = createHeadersAsync(schema);
          const result = await getHeaders();

          expect(result["x-api-key"]).toBe("secret");
        },
        {
          headers: { "x-api-key": "secret" },
        }
      );
    });
  });

  describe("createSearchParams", () => {
    test("should validate search params successfully", () => {
      const schema = {
        page: z.string(),
        limit: z.string(),
      };

      mockContext(
        () => {
          const getSearchParams = createSearchParams(schema);
          const result = getSearchParams();

          expect(result.page).toBe("1");
          expect(result.limit).toBe("10");
        },
        {
          url: "?page=1&limit=10",
        }
      );
    });

    test("should throw ValidationError for missing required param", () => {
      const schema = {
        page: z.string(),
      };

      mockContext(() => {
        const getSearchParams = createSearchParams(schema);
        expect(() => getSearchParams()).toThrow(ValidationError);
      });
    });

    test("should handle optional params", () => {
      const schema = {
        page: z.string().optional(),
      };

      mockContext(() => {
        const getSearchParams = createSearchParams(schema);
        const result = getSearchParams();
        expect(result.page).toBeUndefined();
      });
    });

    test("should coerce types when needed", () => {
      const schema = {
        page: z.coerce.number(),
        limit: z.coerce.number(),
      };

      mockContext(
        () => {
          const getSearchParams = createSearchParams(schema);
          const result = getSearchParams();
          expect(result.page).toBe(1);
          expect(result.limit).toBe(10);
        },
        {
          url: "?page=1&limit=10",
        }
      );
    });
  });

  describe("createSearchParamsAsync", () => {
    test("should validate search params successfully", async () => {
      const schema = {
        page: z.string(),
      };

      await mockContext(
        async () => {
          const getSearchParams = createSearchParamsAsync(schema);
          const result = await getSearchParams();

          expect(result.page).toBe("1");
        },
        {
          url: "?page=1",
        }
      );
    });
  });

  describe("ValidationOptions", () => {
    test("should apply options to all create functions", () => {
      const bodySchema = z.object({ name: z.string() });
      mockContext(
        () => {
          const getBody = createBody(bodySchema, { stripUnknown: false });
          const result = getBody();
          expect(result).toEqual({ name: "John", extra: "field" });
        },
        { body: { name: "John", extra: "field" } }
      );
    });
  });
});
