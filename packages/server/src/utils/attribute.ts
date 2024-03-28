import type { Dict } from "../types.js";
import { toArray } from "./iterable.js";

export type CastTo<T, DT = unknown> = (value: DT) => T;

type CastType<T, DT = unknown> = CastTo<T, DT> | [CastTo<T, DT>] | null | undefined;

export function createAttribute<DT, DR extends boolean>(
  getValues: () => Dict<DT>,
  throwError: (name: string, message: string) => never,
  defaultRequired: DR,
  defaultCast?: CastTo<any>
) {
  // with default
  function getAttribute<T = DT>(name: string): DR extends true ? T : T | undefined;
  function getAttribute<T = DT>(name: string, cast: null, required: true): T;
  function getAttribute<T = DT>(name: string, cast: null, required: false): T | undefined;
  // with casting
  function getAttribute<T>(name: string, castTo: CastTo<T, DT>): DR extends true ? T : T | undefined;
  function getAttribute<T>(name: string, castTo: CastTo<T, DT>, required: true): T;
  function getAttribute<T>(name: string, castTo: CastTo<T, DT>, required: false): T | undefined;
  // with casting as an array
  function getAttribute<T>(name: string, castTo: [CastTo<T, DT>]): DR extends true ? T[] : T[] | undefined;
  function getAttribute<T>(name: string, castTo: [CastTo<T, DT>], required: false): T[] | undefined;
  function getAttribute<T>(name: string, castTo: [CastTo<T, DT>], required: true): T[];

  function getAttribute<T>(name: string, cast: CastType<T, DT> = defaultCast, required: boolean = defaultRequired) {
    const queries = getValues();
    return validateAndCast(name, queries[name], cast!, required);
  }

  function validateAndCast(name: string, value: unknown, cast?: CastType<unknown, any>, required?: boolean): unknown {
    if (required && value === undefined) {
      throwError(name, "value is undefined");
    }

    if (Array.isArray(cast)) {
      return toArray(value).map((v) => validateAndCast(name, v, cast[0], required));
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
