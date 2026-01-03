import { z } from "zod";
import { context, headers, request } from "@minimajs/server";
import { validatorAsync, type ValidationOptions } from "./validation.js";

export * from "./schema.js";

function getSearchParams() {
  return Object.fromEntries(request.url().searchParams);
}

const [getBody] = context.create(() => request().json());

export function createBody<T extends z.ZodTypeAny>(schema: T, option?: ValidationOptions): () => z.infer<T> {
  return validatorAsync(schema, getBody, option, "body");
}

export function createHeaders<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), headers, option, "headers");
}

export function createSearchParams<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), getSearchParams, option, "searchParams");
}

export { type ValidationOptions } from "./validation.js";
