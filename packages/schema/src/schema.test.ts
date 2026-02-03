import { describe, test, expect, beforeEach } from "@jest/globals";
import { z } from "zod";
import { schema } from "./schema.js";
import { createBody } from "./index.js";
import { createResponse, createResponseHeaders } from "./response.js";
import { kRequestSchema, kResponseSchema } from "@minimajs/server/symbols";

describe("schema", () => {
  let mockRouteConfig: Record<string, any>;

  beforeEach(() => {
    mockRouteConfig = {
      metadata: {
        [kRequestSchema]: {},
        [kResponseSchema]: {},
      },
    };
  });

  test("should attach request body schema", () => {
    const bodySchema = z.object({ name: z.string(), age: z.number() });
    const descriptor = createBody(bodySchema);

    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kRequestSchema]).toHaveProperty("body");
    expect(mockRouteConfig.metadata[kRequestSchema].body).toBeDefined();
  });

  test("should attach multiple request schemas", () => {
    const bodySchema = z.object({ name: z.string() });
    const headerSchema = z.object({ authorization: z.string() });
    const paramsSchema = z.object({ id: z.string() });

    const descriptors = [createBody(bodySchema), createBody(headerSchema), createBody(paramsSchema)];
    const metaDescriptor = schema(...descriptors);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kRequestSchema]).toBeDefined();
  });

  test("should attach response body schema with default status code 200", () => {
    const bodySchema = z.object({ id: z.string(), name: z.string() });
    const descriptor = createResponse(bodySchema);

    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeDefined();
    expect(mockRouteConfig.metadata[kResponseSchema][200]).toHaveProperty("body");
  });

  test("should attach response body schema with explicit status code", () => {
    const bodySchema = z.object({ id: z.string() });
    const descriptor = createResponse(201, bodySchema);

    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][201]).toBeDefined();
    expect(mockRouteConfig.metadata[kResponseSchema][201]).toHaveProperty("body");
    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeUndefined();
  });

  test("should attach response headers schema with default status code 200", () => {
    const headersSchema = z.object({ "content-type": z.string() });
    const descriptor = createResponseHeaders(headersSchema);

    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeDefined();
    expect(mockRouteConfig.metadata[kResponseSchema][200]).toHaveProperty("headers");
  });

  test("should attach response headers schema with explicit status code", () => {
    const headersSchema = z.object({ "www-authenticate": z.string() });
    const descriptor = createResponseHeaders(401, headersSchema);

    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][401]).toBeDefined();
    expect(mockRouteConfig.metadata[kResponseSchema][401]).toHaveProperty("headers");
    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeUndefined();
  });

  test("should support different status codes for body and headers independently", () => {
    const bodySchema = z.object({ id: z.string() });
    const headersSchema = z.object({ "x-custom": z.string() });

    const descriptors = [createResponse(200, bodySchema), createResponseHeaders(401, headersSchema)];

    const metaDescriptor = schema(...descriptors);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200]).toHaveProperty("body");
    expect(mockRouteConfig.metadata[kResponseSchema][401]).toHaveProperty("headers");
  });

  test("should merge headers and body for same status code", () => {
    const bodySchema = z.object({ data: z.string() });
    const headersSchema = z.object({ "x-token": z.string() });

    const descriptors = [createResponse(200, bodySchema), createResponseHeaders(200, headersSchema)];

    const metaDescriptor = schema(...descriptors);
    (metaDescriptor as Function)(mockRouteConfig);

    const responseSchema = mockRouteConfig.metadata[kResponseSchema][200];
    expect(responseSchema).toHaveProperty("body");
    expect(responseSchema).toHaveProperty("headers");
  });

  test("should handle multiple error responses with different status codes", () => {
    const errorSchema400 = z.object({ error: z.string() });
    const errorSchema401 = z.object({ message: z.string() });
    const errorSchema500 = z.object({ detail: z.string() });

    const descriptors = [
      createResponse(400, errorSchema400),
      createResponse(401, errorSchema401),
      createResponse(500, errorSchema500),
    ];

    const metaDescriptor = schema(...descriptors);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][400]).toHaveProperty("body");
    expect(mockRouteConfig.metadata[kResponseSchema][401]).toHaveProperty("body");
    expect(mockRouteConfig.metadata[kResponseSchema][500]).toHaveProperty("body");
  });

  test("should handle complex nested schemas", () => {
    const complexSchema = z.object({
      user: z.object({
        id: z.string(),
        profile: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      }),
    });

    const descriptor = createResponse(complexSchema);
    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeDefined();
    expect(mockRouteConfig.metadata[kResponseSchema][200]).toHaveProperty("body");
  });

  test("should convert Zod schema to JSON Schema format", () => {
    const bodySchema = z.object({ name: z.string(), age: z.number() });
    const descriptor = createResponse(bodySchema);

    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    const jsonSchema = mockRouteConfig.metadata[kResponseSchema][200].body;
    expect(jsonSchema).toHaveProperty("type");
    expect(jsonSchema).toHaveProperty("properties");
  });

  test("should handle empty schema array", () => {
    const metaDescriptor = schema();
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kRequestSchema]).toEqual({});
    expect(mockRouteConfig.metadata[kResponseSchema]).toEqual({});
  });

  test("should handle arrays in schemas", () => {
    const arraySchema = z.object({
      items: z.array(z.object({ id: z.string(), name: z.string() })),
    });

    const descriptor = createResponse(arraySchema);
    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeDefined();
    expect(mockRouteConfig.metadata[kResponseSchema][200]).toHaveProperty("body");
  });

  test("should handle union types", () => {
    const unionSchema = z.object({
      result: z.union([
        z.object({ success: z.boolean(), data: z.string() }),
        z.object({ success: z.boolean(), error: z.string() }),
      ]),
    });

    const descriptor = createResponse(unionSchema);
    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeDefined();
  });

  test("should handle optional fields", () => {
    const optionalSchema = z.object({
      id: z.string(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    });

    const descriptor = createResponse(optionalSchema);
    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200]).toBeDefined();
  });

  test("should return a function that accepts route config", () => {
    const descriptor = createResponse(z.object({ id: z.string() }));
    const metaDescriptor = schema(descriptor);

    expect(typeof metaDescriptor).toBe("function");
    expect(() => (metaDescriptor as Function)(mockRouteConfig)).not.toThrow();
  });

  test("should preserve existing request metadata when adding response schemas", () => {
    mockRouteConfig.metadata[kRequestSchema].existingKey = "existingValue";

    const bodySchema = z.object({ name: z.string() });
    const descriptor = createResponse(200, bodySchema);

    const metaDescriptor = schema(descriptor);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kRequestSchema].existingKey).toBe("existingValue");
    expect(mockRouteConfig.metadata[kResponseSchema][200].body).toBeDefined();
  });

  test("should merge multiple response status codes", () => {
    const body200 = z.object({ name: z.string() });
    const body400 = z.object({ error: z.string() });

    const descriptor1 = createResponse(200, body200);
    const descriptor2 = createResponse(400, body400);

    const metaDescriptor = schema(descriptor1, descriptor2);
    (metaDescriptor as Function)(mockRouteConfig);

    expect(mockRouteConfig.metadata[kResponseSchema][200].body).toBeDefined();
    expect(mockRouteConfig.metadata[kResponseSchema][400].body).toBeDefined();
  });
});
