import type { z } from "zod";
import type { kDataType, kSchema, kSchemaName, kStatusCode } from "./symbols.js";

export type SchemaDataTypes = "body" | "headers" | "searchParams" | "params" | "responseBody" | "responseHeaders";

export type SchemaType = {
  [kSchema]: z.ZodType;
  [kDataType]: SchemaDataTypes;
  [kSchemaName]?: string;
  [kStatusCode]?: number;
};

export type SchemaValidator<T> = (() => T) & SchemaType;
