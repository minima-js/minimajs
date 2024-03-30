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
  function getAttribute<T = DT>(name: string, required: true): T;
  function getAttribute<T = DT>(name: string, required: false): T | undefined;

  // with casting
  function getAttribute<T>(name: string, castTo: CastTo<T, DT>): DR extends true ? T : T | undefined;
  function getAttribute<T>(name: string, castTo: CastTo<T, DT>, required: true): T;
  function getAttribute<T>(name: string, castTo: CastTo<T, DT>, required: false): T | undefined;

  // with casting as an array
  function getAttribute<T>(name: string, castTo: [CastTo<T, DT>]): DR extends true ? T[] : T[] | undefined;
  function getAttribute<T>(name: string, castTo: [CastTo<T, DT>], required: false): T[] | undefined;
  function getAttribute<T>(name: string, castTo: [CastTo<T, DT>], required: true): T[];

  function getAttribute<T>(
    name: string,
    cast: CastType<T, DT> | boolean = defaultCast,
    required: boolean = defaultRequired
  ) {
    const queries = getValues();
    if (typeof cast === "boolean") {
      return validateAndCast(name, queries[name], defaultCast, cast);
    }
    return validateAndCast(name, queries[name], cast, required);
  }

  function validateAndCast(name: string, value: unknown, cast: CastType<unknown, any>, required: boolean): unknown {
    if (required && value === undefined) {
      throwError(name, "is required");
    }
    if (Array.isArray(cast)) {
      return toArray(value).map((v) => validateAndCast(name, v, cast[0], required));
    }
    if (cast && value !== undefined) {
      const newVal = cast(value);
      if (Number.isNaN(newVal)) {
        throwError(name, `expects a number, received '${value}'`);
      }
      return newVal;
    }
    return value;
  }
  return getAttribute;
}
