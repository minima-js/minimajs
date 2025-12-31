import { z, type ParseParams } from "zod";
import { context, headers, request } from "@minimajs/server";
import { validatorAsync } from "./validation.js";

function getSearchParams() {
  return Object.fromEntries(request.url().searchParams);
}

const [getBody] = context.create(() => request().json());

export function createBody<T extends z.ZodTypeAny>(schema: T, option?: ParseParams): () => z.infer<T> {
  return validatorAsync(schema, getBody, option);
}

export function createHeaders<T extends z.ZodRawShape>(schema: T, option?: ParseParams) {
  return validatorAsync(z.object(schema), headers, option);
}

export function createSearchParams<T extends z.ZodRawShape>(schema: T, option?: ParseParams) {
  return validatorAsync(z.object(schema), getSearchParams, option);
}

export { ValidationError, type ValidatorErrorOptions, defaultErrorMap, type ZodErrorMap } from "./error.js";
