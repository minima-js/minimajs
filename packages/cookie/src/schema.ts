import { validator, validatorAsync } from "@minimajs/schema/validation";
import type { ObjectShape, ValidateOptions } from "yup";
import { cookies } from "./index.js";

export function createCookies<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, cookies, option);
}

export function createCookiesAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, cookies, option);
}
