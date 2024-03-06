import { getBody, getHeaders, getQueries } from "@minimajs/server";
import type { ObjectShape } from "yup";
import { validator, validatorAsync } from "./validation.js";

export function createBody<T extends ObjectShape>(obj: T) {
  return validator(obj, getBody);
}

export function createBodyAsync<T extends ObjectShape>(obj: T) {
  return validatorAsync(obj, getBody);
}

export function createHeaders<T extends ObjectShape>(obj: T) {
  return validator(obj, getHeaders);
}

export function createHeadersAsync<T extends ObjectShape>(obj: T) {
  return validatorAsync(obj, getHeaders);
}

export function createQueries<T extends ObjectShape>(obj: T) {
  return validator(obj, getQueries);
}

export function createQueriesAsync<T extends ObjectShape>(obj: T) {
  return validatorAsync(obj, getQueries);
}

export * from "yup";
export { ValidationError } from "./error.js";
export { ValidationError as BaseError } from "yup";
