import type { ObjectShape, ValidateOptions } from "yup";
import { body, headers, request } from "@minimajs/server";
import { validator, validatorAsync } from "./validation.js";

function getSearchParams() {
  return request().query;
}

export function createBody<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, body, option);
}

export function createBodyAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, body, option);
}

export function createHeaders<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, headers, option);
}

export function createHeadersAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, headers, option);
}

export function createSearchParams<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, getSearchParams, option);
}

export function createSearchParamsAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, getSearchParams, option);
}

export { ValidationError, type ValidatorErrorOptions, type Params, type Spec } from "./error.js";
