import type { ObjectShape, ValidateOptions } from "yup";
import { getBody, getHeaders, getRequest } from "@minimajs/server";
import { validator, validatorAsync } from "./validation.js";

function getSearchParams() {
  const request = getRequest();
  return request.query;
}

export function createBody<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, getBody, option);
}

export function createBodyAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, getBody, option);
}

export function createHeaders<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, getHeaders, option);
}

export function createHeadersAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, getHeaders, option);
}

export function createSearchParams<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, getSearchParams, option);
}

export function createSearchParamsAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, getSearchParams, option);
}

export * from "yup";
export { ValidationError, ValidationBaseError } from "./error.js";
