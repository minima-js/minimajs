import type { OpenAPI } from "./types.js";

/**
 * Cleans JSON Schema for OpenAPI compatibility.
 * Removes properties that are valid in JSON Schema but not in OpenAPI.
 */
export function cleanJSONSchema(schema: unknown): OpenAPI.SchemaObject {
  if (!schema || typeof schema !== "object") {
    return schema as OpenAPI.SchemaObject;
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip JSON Schema meta properties not valid in OpenAPI
    if (key === "$schema" || key === "$id" || key.startsWith("$meta-")) {
      continue;
    }

    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        cleaned[key] = value.map((item) => (typeof item === "object" ? cleanJSONSchema(item) : item));
      } else {
        cleaned[key] = cleanJSONSchema(value);
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as OpenAPI.SchemaObject;
}
