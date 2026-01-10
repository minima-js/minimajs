import { z } from "zod";
import { body, headers, searchParams } from "@minimajs/server";
import { validator, validatorAsync, type ValidationOptions } from "./validation.js";

export function createBody<T extends z.ZodTypeAny>(schema: T, option?: ValidationOptions) {
  return validator(schema, body, option);
}

export function createBodyAsync<T extends z.ZodTypeAny>(schema: T, option?: ValidationOptions) {
  return validatorAsync(schema, body, option);
}

export function createHeaders<T extends z.ZodRawShape>(obj: T, option?: ValidationOptions) {
  return validator(z.object(obj), headers, option);
}

export function createHeadersAsync<T extends z.ZodRawShape>(obj: T, option?: ValidationOptions) {
  return validatorAsync(z.object(obj), headers, option);
}

export function createSearchParams<T extends z.ZodRawShape>(obj: T, option?: ValidationOptions) {
  return validator(z.object(obj), searchParams, option);
}

export function createSearchParamsAsync<T extends z.ZodRawShape>(obj: T, option?: ValidationOptions) {
  return validatorAsync(z.object(obj), searchParams, option);
}

export { ValidationError, type ValidatorErrorOptions } from "./error.js";
export { type ValidationOptions } from "./validation.js";
