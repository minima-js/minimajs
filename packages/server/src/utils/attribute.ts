import type { Dict } from "../types.js";
import { toArray } from "./iterable.js";

export type CastTo<T> = (value: unknown) => T;

export function createAttribute<DT, DRT>(
  getValues: () => Dict<unknown>,
  throwError: (name: string, message: string) => never,
  defaultRequired = false,
  defaultCast?: CastTo<any>
) {
  function getAttribute(name: string): DT;
  function getAttribute(name: string, cast: null, required: true): DRT;
  function getAttribute<T>(name: string, castTo: CastTo<T>): T | undefined;
  function getAttribute<T>(name: string, castTo: CastTo<T>, required: true): T;
  function getAttribute<T>(name: string, castTo: [CastTo<T>]): T[] | undefined;
  function getAttribute<T>(
    name: string,
    castTo: [CastTo<T>],
    required: true
  ): T[];

  function getAttribute<T>(
    name: string,
    cast: CastTo<T> | [CastTo<T>] | null | undefined = defaultCast,
    required = defaultRequired
  ) {
    const queries = getValues();
    return validateAndCast(name, queries[name], cast!, required);
  }

  function validateAndCast(
    name: string,
    value: unknown,
    cast?: CastTo<unknown> | [CastTo<unknown>],
    required?: boolean
  ): unknown {
    if (required && value === undefined) {
      throwError(name, "value is undefined");
    }
    if (Array.isArray(cast)) {
      return toArray(value).map((v) =>
        validateAndCast(name, v, cast[0], required)
      );
    }
    if (cast) {
      const newValue = cast(value);
      if (value && Number.isNaN(newValue)) {
        throwError(name, "value is NaN");
      }
      return newValue;
    }
    return value;
  }
  return getAttribute;
}
