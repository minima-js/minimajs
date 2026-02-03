/**
 * Cleans JSON Schema for OpenAPI compatibility.
 * Removes properties that are valid in JSON Schema but not in OpenAPI.
 */
export function cleanJSONSchema(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const cleaned: any = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip JSON Schema meta properties not valid in OpenAPI
    if (key === "$schema" || key === "$id" || key === "$defs") {
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

  return cleaned;
}

/**
 * Extracts path parameters from an OpenAPI path string.
 * Converts Express-style parameters (`:id`) to OpenAPI format (`{id}`).
 */
export function extractPathParameters(path: string): Array<{
  name: string;
  in: "path";
  required: true;
  schema: { type: "string" };
}> {
  const paramRegex = /:(\w+)/g;
  const params: Array<{
    name: string;
    in: "path";
    required: true;
    schema: { type: "string" };
  }> = [];

  let match;
  while ((match = paramRegex.exec(path)) !== null) {
    params.push({
      name: match[1]!,
      in: "path",
      required: true,
      schema: { type: "string" },
    });
  }

  return params;
}
