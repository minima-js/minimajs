import { toArray } from "./iterable.js";

export type CastTo<T, DT = unknown> = (value: DT) => T;

type CastType<T, DT = unknown> = CastTo<T, DT> | [CastTo<T, DT>] | null | undefined;

export function createAttribute<OT, DT = OT, DR extends boolean = false, N extends string = string>(
  getValues: () => Record<N, OT>,
  throwError: (name: N, message: string) => never,
  defaultRequired: DR,
  defaultCast?: CastTo<DT, OT>
) {
  // with default
  function getAttribute<T = DT>(name: N): DR extends true ? T : T | undefined;
  function getAttribute<T = DT>(name: N, required: true): T;
  function getAttribute<T = DT>(name: N, required: false): T | undefined;

  // with casting
  function getAttribute<T>(name: N, castTo: CastTo<T, OT>): DR extends true ? T : T | undefined;
  function getAttribute<T>(name: N, castTo: CastTo<T, OT>, required: true): T;
  function getAttribute<T>(name: N, castTo: CastTo<T, OT>, required: false): T | undefined;

  // with casting as an array
  function getAttribute<T>(name: N, castTo: [CastTo<T, OT>]): DR extends true ? T[] : T[] | undefined;
  function getAttribute<T>(name: N, castTo: [CastTo<T, OT>], required: false): T[] | undefined;
  function getAttribute<T>(name: N, castTo: [CastTo<T, OT>], required: true): T[];

  function getAttribute(name: N, cast: CastType<any, OT> | boolean = defaultCast, required: boolean = defaultRequired) {
    const queries = getValues();
    if (typeof cast === "boolean") {
      return validateAndCast(name, queries[name], defaultCast, cast);
    }
    return validateAndCast(name, queries[name], cast, required);
  }

  function validateAndCast(name: N, value: unknown, cast: CastType<unknown, any>, required: boolean): unknown {
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
