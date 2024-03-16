import { getBody, getHeaders, getSearchParams } from "@minimajs/server";
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

export function createSearchParams<T extends ObjectShape>(obj: T) {
  return validator(obj, getSearchParams);
}

export function createSearchParamsAsync<T extends ObjectShape>(obj: T) {
  return validatorAsync(obj, getSearchParams);
}

export * from "yup";
export { ValidationError } from "./error.js";
export { ValidationError as BaseError } from "yup";
