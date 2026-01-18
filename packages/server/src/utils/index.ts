/**
 * @minimajs/server/utils - Utility functions
 *
 * Collection of utility functions for type checking, iteration, and other common operations.
 *
 * @module @minimajs/server/utils
 *
 * @example
 * ```typescript
 * import { isCallable } from '@minimajs/server/utils';
 *
 * if (isCallable(fn)) {
 *   fn();
 * }
 * ```
 */

import { isCallable } from "./callable.js";

export * from "./callable.js";
export * from "./iterable.js";
export * from "./headers.js";

export function has<K extends string | symbol>(obj: unknown, property: K): obj is Record<K, unknown> {
  return obj != null && obj !== undefined && property in (obj as object);
}

export namespace has {
  export function fn<K extends string | symbol>(obj: any, property: K): obj is Record<K, (...args: unknown[]) => unknown> {
    return isCallable(obj?.[property]);
  }
}
