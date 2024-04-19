import { validator, validatorAsync } from "@minimajs/schema/validation";
import type { ObjectShape, ValidateOptions } from "@minimajs/schema";
import { getCookies } from "./index.js";

export function createCookies<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validator(obj, getCookies, option);
}

export function createCookiesAsync<T extends ObjectShape>(obj: T, option: ValidateOptions = {}) {
  return validatorAsync(obj, getCookies, option);
}
