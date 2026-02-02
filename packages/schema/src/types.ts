import type { z } from "zod";
import type { kDataType, kSchema, kStatusCode } from "./symbols.js";

export type SchemaDataTypes =
  | "body"
  | "headers"
  | "searchParams"
  | "params"
  | "responseBody"
  | "responseHeaders";

export type SchemaType = {
  [kSchema]: z.ZodType;
  [kDataType]: SchemaDataTypes;
  [kStatusCode]?: number;
};
