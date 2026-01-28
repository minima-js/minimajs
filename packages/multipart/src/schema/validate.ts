import type { ZodArray } from "zod";
import { maxLengthError } from "./zod-error.js";

export function maxLength(schema: ZodArray, length: number, path: string) {
  const maximum = schema._zod.bag.maximum as number | undefined;
  if (maximum === undefined) {
    return;
  }
  if (length < maximum) {
    return;
  }
  throw maxLengthError(schema, length, path);
}
