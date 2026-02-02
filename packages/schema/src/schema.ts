import { z } from "zod";
import type { SchemaType } from "./types.js";
import { kRequestSchema, kResponseSchema } from "@minimajs/server/symbols";
import type { RouteMetaDescriptor, ResponseSchema } from "@minimajs/server";
import { kDataType, kSchema, kStatusCode } from "./symbols.js";

/**
 * Creates a route metadata descriptor that attaches JSON schemas to routes.
 *
 * Converts Zod schemas to JSON Schema format and separates them into request
 * (body, headers, searchParams, params) and response schemas for OpenAPI documentation.
 *
 * @param schemas - Schema validators created by createBody, createHeaders, etc.
 * @returns A RouteMetaDescriptor that attaches the schemas to route metadata
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
const REQUEST_TYPES = new Set(["body", "headers", "searchParams", "params"]);
const RESPONSE_TYPE_MAP: Record<string, "body" | "headers"> = {
  responseBody: "body",
  responseHeaders: "headers",
};

export function schema(...schemas: SchemaType[]): RouteMetaDescriptor {
  return function (routeConfig) {
    const request: Record<string, unknown> = {};
    const response: ResponseSchema = {};

    for (const s of schemas) {
      const dataType = s[kDataType];
      const jsonSchema = z.toJSONSchema(s[kSchema]);

      if (REQUEST_TYPES.has(dataType)) {
        request[dataType] = jsonSchema;
      } else {
        const responseKey = RESPONSE_TYPE_MAP[dataType];
        if (responseKey) {
          const statusCode = s[kStatusCode] ?? 200;
          response[statusCode] ??= {};
          (response[statusCode] as Record<string, unknown>)[responseKey] = jsonSchema;
        }
      }
    }

    Object.assign(routeConfig.metadata[kRequestSchema], request);
    Object.assign(routeConfig.metadata[kResponseSchema], response);
  };
}
