import { z, type ZodType } from "zod";
import { body, headers, params, searchParams } from "@minimajs/server";

import { validator, validatorAsync, type ValidationOptions } from "./validation.js";

export function createBody<T extends ZodType>(schema: T, option: ValidationOptions = {}) {
  return validator(schema, body, option, "body");
}

export function createBodyAsync<T extends ZodType>(schema: T, option: ValidationOptions = {}) {
  return validatorAsync(schema, body, option, "body");
}

export function createHeaders<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validator(z.object(obj), headers, option, "headers");
}

export function createHeadersAsync<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validatorAsync(z.object(obj), headers, option, "headers");
}

export function createSearchParams<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validator(z.object(obj), searchParams, option, "searchParams");
}

export function createSearchParamsAsync<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validatorAsync(z.object(obj), searchParams, option, "searchParams");
}

export function createParams<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validator(z.object(obj), params, option, "params");
}

export function createParamsAsync<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validatorAsync(z.object(obj), params, option, "params");
}

export { createResponse } from "./response.js";
export { schema } from "./schema.js";
export { ValidationError, type ValidatorErrorOptions } from "./error.js";
export { type ValidationOptions } from "./validation.js";
