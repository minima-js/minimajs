import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "@minimajs/server/bun";
import { generateOpenAPIDocument } from "./generator.js";
import { generateOperationId } from "./helpers.js";
import { kRequestSchema, kResponseSchema } from "@minimajs/server/symbols";
import { kOperation } from "./symbols.js";
import type { OpenAPI } from "./types.js";
import type { App } from "@minimajs/server";

function createBaseDocument(): OpenAPI.Document {
  return {
    openapi: "3.1.0",
    info: { title: "Test API", version: "1.0.0" },
    paths: {},
  };
}

describe("generateOperationId", () => {
  test("converts method and path to camelCase", () => {
    expect(generateOperationId("GET", "/users")).toBe("getUsers");
    expect(generateOperationId("POST", "/users/:id/posts")).toBe("postUsersIdPosts");
    expect(generateOperationId("DELETE", "/api/v1/items/{itemId}")).toBe("deleteApiV1ItemsItemid");
  });
});

describe("generateOpenAPIDocument", () => {
  let app: App;

  beforeEach(() => {
    app = createApp({ logger: false, moduleDiscovery: false });
  });

  afterEach(async () => {
    await app.close();
  });

  test("generates document with basic routes", () => {
    app.get("/health", () => ({ status: "ok" }));

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    expect(doc.paths!["/health"]).toBeDefined();
    expect(doc.paths!["/health"]!.get).toBeDefined();
    expect(doc.paths!["/health"]!.get!.operationId).toBe("getHealth");
    expect(doc.paths!["/health"]!.get!.responses!.default).toEqual({ description: "Default response" });
  });

  test("converts path params from :id to {id} format", () => {
    app.get("/users/:userId/posts/:postId", () => ({}));

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    expect(doc.paths!["/users/{userId}/posts/{postId}"]).toBeDefined();
    const params = doc.paths!["/users/{userId}/posts/{postId}"]!.get!.parameters as OpenAPI.ParameterObject[];
    expect(params).toContainEqual(expect.objectContaining({ name: "userId", in: "path", required: true }));
    expect(params).toContainEqual(expect.objectContaining({ name: "postId", in: "path", required: true }));
  });

  test("includes request body schema", () => {
    app.post("/items", [kRequestSchema, { body: { type: "object", properties: { name: { type: "string" } } } }], () => ({}));

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    const requestBody = doc.paths!["/items"]!.post!.requestBody as OpenAPI.RequestBodyObject;
    expect(requestBody.required).toBe(true);
    expect(requestBody.content["application/json"]!.schema).toMatchObject({
      type: "object",
      properties: { name: { type: "string" } },
    });
  });

  test("includes header and query parameters", () => {
    app.get(
      "/search",
      [
        kRequestSchema,
        {
          headers: { type: "object", properties: { authorization: { type: "string" } }, required: ["authorization"] },
          searchParams: { type: "object", properties: { q: { type: "string" }, limit: { type: "integer" } } },
        },
      ],
      () => ({})
    );

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    const params = doc.paths!["/search"]!.get!.parameters as OpenAPI.ParameterObject[];
    expect(params).toContainEqual(expect.objectContaining({ name: "authorization", in: "header", required: true }));
    expect(params).toContainEqual(expect.objectContaining({ name: "q", in: "query", required: false }));
    expect(params).toContainEqual(expect.objectContaining({ name: "limit", in: "query", required: false }));
  });

  test("includes response schemas with status descriptions", () => {
    app.get(
      "/resource",
      [
        kResponseSchema,
        {
          200: { body: { type: "object", properties: { id: { type: "string" } } } },
          404: { body: { type: "object", properties: { error: { type: "string" } } } },
        },
      ],
      () => ({})
    );

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    const responses = doc.paths!["/resource"]!.get!.responses!;
    expect(responses["200"]!.description).toBe("OK");
    expect(responses["404"]!.description).toBe("Not Found");
    expect((responses["200"] as OpenAPI.ResponseObject).content!["application/json"]!.schema).toMatchObject({
      type: "object",
      properties: { id: { type: "string" } },
    });
  });

  test("hoists description from property schema to parameter level", () => {
    app.get(
      "/search",
      [
        kRequestSchema,
        {
          headers: {
            type: "object",
            properties: { authorization: { type: "string", description: "Bearer token" } },
            required: ["authorization"],
          },
          searchParams: { type: "object", properties: { q: { type: "string", description: "Search query" } } },
          params: { type: "object", properties: {} },
        },
      ],
      () => ({})
    );

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    const params = doc.paths!["/search"]!.get!.parameters as OpenAPI.ParameterObject[];
    const authParam = params.find((p) => p.name === "authorization")!;
    const qParam = params.find((p) => p.name === "q")!;
    expect(authParam.description).toBe("Bearer token");
    expect(qParam.description).toBe("Search query");
  });

  test("includes response headers", () => {
    app.get(
      "/with-headers",
      [kResponseSchema, { 200: { headers: { type: "object", properties: { "x-request-id": { type: "string" } } } } }],
      () => ({})
    );

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    const headers = (doc.paths!["/with-headers"]!.get!.responses!["200"] as OpenAPI.ResponseObject).headers;
    expect(headers!["x-request-id"]).toBeDefined();
  });

  test("hoists description on response headers and cleans schema", () => {
    app.get(
      "/with-headers",
      [
        kResponseSchema,
        {
          200: {
            headers: {
              type: "object",
              properties: { "x-token": { type: "string", description: "Auth token", $schema: "ignore" } },
            },
          },
        },
      ],
      () => ({})
    );

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    const header = (doc.paths!["/with-headers"]!.get!.responses!["200"] as OpenAPI.ResponseObject).headers![
      "x-token"
    ] as OpenAPI.HeaderObject;
    expect(header.description).toBe("Auth token");
    expect((header.schema as Record<string, unknown>)?.["$schema"]).toBeUndefined();
  });

  test("does not overwrite existing component schema on title collision", () => {
    app.post(
      "/a",
      [kRequestSchema, { body: { type: "object", title: "Thing", properties: { x: { type: "string" } } } }],
      () => ({})
    );
    app.post(
      "/b",
      [kRequestSchema, { body: { type: "object", title: "Thing", properties: { y: { type: "number" } } } }],
      () => ({})
    );

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    expect(doc.components!.schemas!.Thing).toMatchObject({ properties: { x: { type: "string" } } });
    expect(doc.components!.schemas!.Thing).not.toMatchObject({ properties: { y: expect.anything() } });
  });

  test("applies operation metadata from kOperation", () => {
    app.get("/documented", [kOperation, { summary: "Get documented", tags: ["docs"], deprecated: true }], () => ({}));

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    const operation = doc.paths!["/documented"]!.get!;
    expect(operation.summary).toBe("Get documented");
    expect(operation.tags).toEqual(["docs"]);
    expect(operation.deprecated).toBe(true);
  });

  test("extracts titled schemas to components", () => {
    app.post(
      "/entities",
      [kRequestSchema, { body: { type: "object", title: "CreateEntityRequest", properties: { name: { type: "string" } } } }],
      () => ({})
    );

    const doc = generateOpenAPIDocument(app, createBaseDocument());

    expect(doc.components!.schemas!.CreateEntityRequest).toBeDefined();
    const requestBody = doc.paths!["/entities"]!.post!.requestBody as OpenAPI.RequestBodyObject;
    expect(requestBody.content["application/json"]!.schema).toEqual({ $ref: "#/components/schemas/CreateEntityRequest" });
  });
});
