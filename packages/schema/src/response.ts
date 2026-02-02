import type { ZodType } from "zod";
import type { SchemaType } from "./types.js";
import { kDataType, kSchema, kStatusCode } from "./symbols.js";

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
export function createResponse<T extends ZodType>(schema: T): SchemaType;
export function createResponse<T extends ZodType>(statusCode: number, schema: T): SchemaType;
export function createResponse<T extends ZodType>(statusCodeOrSchema: number | T, schema?: T): SchemaType {
  if (typeof statusCodeOrSchema === "number") {
    return {
      [kDataType]: "responseBody",
      [kSchema]: schema!,
      [kStatusCode]: statusCodeOrSchema,
    };
  }
  return {
    [kDataType]: "responseBody",
    [kSchema]: statusCodeOrSchema,
    [kStatusCode]: 200,
  };
}
