import { z } from "zod";
import { body, headers, params, searchParams } from "@minimajs/server";
import { validatorAsync, type ValidationOptions } from "./validation.js";

export * from "./schema.js";

export function createBody<T extends z.ZodTypeAny>(schema: T, option?: ValidationOptions): () => z.infer<T> {
  return validatorAsync(schema, body, option, "body");
}

export function createHeaders<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), headers, option, "headers");
}

export function createSearchParams<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), searchParams, option, "searchParams");
}

export function createParams<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), params, option, "params");
}

export { type ValidationOptions } from "./validation.js";
