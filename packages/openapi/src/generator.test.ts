import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createApp } from "@minimajs/server/bun";
import { generateOpenAPIDocument, generateOperationId } from "./generator.js";
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
