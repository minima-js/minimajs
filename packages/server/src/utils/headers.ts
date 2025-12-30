/**
 * Header utility functions
 * @module @minimajs/server/utils/headers
 */

/**
 * Merges multiple Headers objects into the base Headers object.
 * Later headers take precedence and override earlier ones.
 * Mutates the base Headers object in place.
 *
 * @param base - The base Headers object to merge into (will be mutated)
 * @param headers - Additional Headers objects to merge (in order of precedence)
 * @returns The base Headers object with all headers merged
 *
 * @example
 * ```typescript
 * import { mergeHeaders } from '@minimajs/server/utils';
 *
 * const base = new Headers({ 'Content-Type': 'text/plain' });
 * const override = new Headers({ 'Content-Type': 'application/json' });
 * const merged = mergeHeaders(base, override);
 * // base and merged are the same object
 * // base will have Content-Type: application/json
 * ```
 */
export function mergeHeaders(base: Headers, ...headers: Headers[]): Headers {
  for (const header of headers) {
    for (const [key, value] of header) {
      base.set(key, value);
    }
  }
  return base;
}
