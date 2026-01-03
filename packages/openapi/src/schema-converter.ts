import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export interface SchemaConverterOptions {
  target?: "openApi3";
  $refStrategy?: "root" | "relative" | "none";
}

export function convertZodToOpenAPI(
  schema: z.ZodTypeAny,
  options?: SchemaConverterOptions
): any {
  const jsonSchema = zodToJsonSchema(schema as any, {
    target: options?.target || "openApi3",
    $refStrategy: options?.$refStrategy || "none",
  });

  return cleanSchema(jsonSchema);
}

function cleanSchema(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  const cleaned: any = {};

  for (const [key, value] of Object.entries(schema)) {
    if (key === "$schema") {
      continue;
    }

    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        cleaned[key] = value.map(cleanSchema);
      } else {
        cleaned[key] = cleanSchema(value);
      }
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

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
