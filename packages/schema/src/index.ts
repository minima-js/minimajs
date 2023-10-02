import { getBody, getHeaders, getQueries } from "@minimajs/app";
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

export function createQuery<T extends ObjectShape>(obj: T) {
  return validator(obj, getQueries);
}

export function createQueryAsync<T extends ObjectShape>(obj: T) {
  return validatorAsync(obj, getQueries);
}

export * from "yup";
