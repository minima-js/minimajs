export { default as merge } from "deepmerge";
import { isCallable } from "./callable.js";

/**
 * Type guard to check if an object is an async iterable.
 * Verifies the presence and validity of the Symbol.asyncIterator method.
 */
export function isAsyncIterator<T>(obj: unknown): obj is AsyncIterable<T> {
  if (!isObject(obj)) return false;
  const method = obj[Symbol.asyncIterator];
  if (!isCallable(method)) return false;
  const aIter = method.call(obj);
  return aIter === obj;
}

/**
 * Type guard to check if a value is a non-null object.
 * Uses the Object() wrapper to distinguish objects from primitives.
 */
export function isObject(data: unknown): data is Record<string | symbol, unknown> {
  return Object(data) === data;
}

/**
 * Normalizes a value to an array.
 * Returns empty array for null, wraps single values, returns arrays unchanged.
 */
export function toArray<T>(value: null | T | T[]): T[] {
  if (value === null) {
    return [];
  }
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}

/**
 * Extracts the last value from an array or returns the value itself.
 * Useful for getting the final element from array or single values.
 */
export function toLastValue<T>(value: T | T[]): T {
  if (Array.isArray(value)) return value[value.length - 1]!;
  return value;
}

/**
 * Extracts the first value from an array or returns the value itself.
 * Useful for normalizing array or single values to a single value.
 */
export const toFirstValue = <T>(v: T | T[]): T => (Array.isArray(v) ? v[0]! : v);
