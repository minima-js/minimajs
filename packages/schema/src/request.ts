import { z, type ZodType } from "zod";
import { body, headers, params, searchParams } from "@minimajs/server";

import { validator, validatorAsync, type ValidationOptions } from "./validation.js";

export function createBody<T extends ZodType>(schema: T, option: ValidationOptions = {}) {
  return validator(schema, body, "body", option);
}

export function createBodyAsync<T extends ZodType>(schema: T, option: ValidationOptions = {}) {
  return validatorAsync(schema, body, "body", option);
}

export function createHeaders<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validator(z.object(obj), headers, "headers", option);
}

export function createHeadersAsync<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validatorAsync(z.object(obj), headers, "headers", option);
}

export function createSearchParams<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validator(z.object(obj), searchParams, "searchParams", option);
}

export function createSearchParamsAsync<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validatorAsync(z.object(obj), searchParams, "searchParams", option);
}

export function createParams<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validator(z.object(obj), params, "params", option);
}

export function createParamsAsync<T extends z.ZodRawShape>(obj: T, option: ValidationOptions = {}) {
  return validatorAsync(z.object(obj), params, "params", option);
}
