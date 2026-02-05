import { z, type ZodType, type ZodRawShape } from "zod";
import type { SchemaType } from "./types.js";
import { kDataType, kSchema, kSchemaName, kStatusCode } from "./symbols.js";

/**
 * Creates a response body schema descriptor for OpenAPI documentation.
 *
 * Unlike request validators, this doesn't perform runtime validation -
 * it only attaches the schema to route metadata for documentation generation.
 *
 * @param statusCodeOrSchema - Either a status code (number) or a Zod schema
 * @param schema - A Zod schema (only when first param is status code)
 * @returns A SchemaType that can be passed to the `schema()` function
 *
 * @example
 * ```typescript
 * import { schema, createBody, createResponse } from "@minimajs/schema";
 * import { z } from "zod";
 *
 * const bodySchema = createBody(z.object({ name: z.string() }));
 *
 * // Default status code (200)
 * const responseSchema = createResponse(z.object({ id: z.string(), name: z.string() }));
 *
 * // Explicit status code
 * const createdSchema = createResponse(201, z.object({ id: z.string() }));
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
export function createResponse<T extends ZodType>(schema: T, options?: { name?: string }): SchemaType;
export function createResponse<T extends ZodType>(statusCode: number, schema: T, options?: { name?: string }): SchemaType;
export function createResponse<T extends ZodType>(
  statusCodeOrSchema: number | T,
  schemaOrOptions?: T | { name?: string },
  options?: { name?: string }
): SchemaType {
  if (typeof statusCodeOrSchema === "number") {
    return {
      [kDataType]: "responseBody",
      [kSchema]: schemaOrOptions as T,
      [kSchemaName]: options?.name,
      [kStatusCode]: statusCodeOrSchema,
    };
  }
  return {
    [kDataType]: "responseBody",
    [kSchema]: statusCodeOrSchema,
    [kSchemaName]: (schemaOrOptions as { name?: string } | undefined)?.name,
    [kStatusCode]: 200,
  };
}

/**
 * Creates a response headers schema descriptor for OpenAPI documentation.
 *
 * Unlike request validators, this doesn't perform runtime validation -
 * it only attaches the schema to route metadata for documentation generation.
 *
 * This allows you to document response headers independently from the response body,
 * enabling different status codes for headers and body schemas.
 *
 * @param statusCodeOrObj - Either a status code (number) or an object with Zod schemas
 * @param obj - An object with Zod schemas (only when first param is status code)
 * @returns A SchemaType that can be passed to the `schema()` function
 *
 * @example
 * ```typescript
 * import { schema, createBody, createResponse, createResponseHeaders } from "@minimajs/schema";
 * import { z } from "zod";
 *
 * const bodySchema = createBody(z.object({ name: z.string() }));
 * const responseBodySchema = createResponse(z.object({ id: z.string(), name: z.string() }));
 * const responseHeadersSchema = createResponseHeaders({ 'x-custom': z.string() });
 *
 * // Different status codes for body and headers
 * const createdBodySchema = createResponse(201, z.object({ id: z.string() }));
 * const unauthorizedHeadersSchema = createResponseHeaders(401, { 'www-authenticate': z.string() });
 *
 * app.post('/users',
 *   schema(bodySchema, createdBodySchema, responseHeadersSchema, unauthorizedHeadersSchema),
 *   () => {
 *     const { name } = bodySchema();
 *     return { id: crypto.randomUUID(), name };
 *   }
 * );
 * ```
 */
export function createResponseHeaders<T extends ZodRawShape>(obj: T, options?: { name?: string }): SchemaType;
export function createResponseHeaders<T extends ZodRawShape>(
  statusCode: number,
  obj: T,
  options?: { name?: string }
): SchemaType;
export function createResponseHeaders<T extends ZodRawShape>(
  statusCodeOrObj: number | T,
  objOrOptions?: T | { name?: string },
  options?: { name?: string }
): SchemaType {
  if (typeof statusCodeOrObj === "number") {
    return {
      [kDataType]: "responseHeaders",
      [kSchema]: z.object(objOrOptions as T),
      [kSchemaName]: options?.name,
      [kStatusCode]: statusCodeOrObj,
    };
  }
  return {
    [kDataType]: "responseHeaders",
    [kSchema]: z.object(statusCodeOrObj),
    [kSchemaName]: (objOrOptions as { name?: string } | undefined)?.name,
    [kStatusCode]: 200,
  };
}
