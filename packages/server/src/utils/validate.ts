import { toArray } from "./iterable.js";

export type CastTo<T> = (value: unknown) => T;

export function validateAndCast(
  value: unknown,
  cast?: CastTo<unknown> | [CastTo<unknown>],
  required?: boolean
): any {
  if (required && value === undefined) {
    throw new Error("value is undefined");
  }
  if (Array.isArray(cast)) {
    return toArray(value).map((v) => validateAndCast(v, cast[0], required));
  }
  if (cast) {
    const newValue = cast(value);
    if (value && Number.isNaN(newValue)) {
      throw new Error("value is NaN");
    }
    return newValue;
  }
  return value;
}
