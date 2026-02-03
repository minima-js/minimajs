import { z } from "zod";
import type { SchemaType } from "./types.js";
import { kRequestSchema, kResponseSchema } from "@minimajs/server/symbols";
import type { RouteMetaDescriptor, ResponseSchema } from "@minimajs/server";
import { kDataType, kSchema, kStatusCode } from "./symbols.js";

const REQUEST_SCHEMA_TYPES = new Set(["body", "headers", "searchParams", "params"]);
const RESPONSE_TYPE_MAP: Record<string, "body" | "headers"> = {
  responseBody: "body",
  responseHeaders: "headers",
};

/**
 * Helper function to process a request schema
 */
function processRequestSchema(request: Record<string, unknown>, dataType: string, jsonSchema: unknown): void {
  request[dataType] = jsonSchema;
}

/**
 * Helper function to process a response schema
 */
function processResponseSchema(response: ResponseSchema, dataType: string, jsonSchema: unknown, statusCode: number): void {
  const responseKey = RESPONSE_TYPE_MAP[dataType];
  if (!responseKey) return;

  response[statusCode] ??= {};
  (response[statusCode] as Record<string, unknown>)[responseKey] = jsonSchema;
}

/**
 * Creates a route metadata descriptor that attaches JSON schemas to routes.
 *
 * Converts Zod schemas to JSON Schema format and separates them into request
 * (body, headers, searchParams, params) and response schemas for OpenAPI documentation.
 *
 * @example
 * ```typescript
 * import { schema, createBody, createResponse } from "@minimajs/schema";
 * import { z } from "zod";
 *
 * const bodySchema = createBody(z.object({ name: z.string() }));
 * const responseSchema = createResponse(z.object({ id: z.string(), name: z.string() }));
 * const errorSchema = createResponse(400, z.object({ error: z.string() }));
 *
 * app.post('/users',
 *   schema(bodySchema, responseSchema, errorSchema),
 *   () => {
 *     const { name } = bodySchema();
 *     return { id: crypto.randomUUID(), name };
 *   }
 * );
 * ```
 */
export function schema(...schemas: SchemaType[]): RouteMetaDescriptor {
  return function (routeConfig) {
    const request: Record<string, unknown> = {};
    const response: ResponseSchema = {};

    for (const schemaDescriptor of schemas) {
      const dataType = schemaDescriptor[kDataType];
      const jsonSchema = z.toJSONSchema(schemaDescriptor[kSchema]);
      const statusCode = schemaDescriptor[kStatusCode] ?? 200;

      if (REQUEST_SCHEMA_TYPES.has(dataType)) {
        processRequestSchema(request, dataType, jsonSchema);
      } else {
        processResponseSchema(response, dataType, jsonSchema, statusCode);
      }
    }

    Object.assign(routeConfig.metadata[kRequestSchema], request);
    Object.assign(routeConfig.metadata[kResponseSchema], response);
  };
}
