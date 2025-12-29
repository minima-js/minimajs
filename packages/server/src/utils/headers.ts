/**
 * Header utility functions
 * @module @minimajs/server/utils/headers
 */

/**
 * Merges multiple Headers objects into a single Headers object.
 * Later headers take precedence and override earlier ones.
 *
 * @param base - The base Headers object to start with
 * @param headers - Additional Headers objects to merge (in order of precedence)
 * @returns A new Headers object with all headers merged
 *
 * @example
 * ```typescript
 * import { mergeHeaders } from '@minimajs/server/utils';
 *
 * const base = new Headers({ 'Content-Type': 'text/plain' });
 * const override = new Headers({ 'Content-Type': 'application/json' });
 * const merged = mergeHeaders(base, override);
 * // merged will have Content-Type: application/json
 * ```
 */
export function mergeHeaders(base: Headers, ...headers: Headers[]): Headers {
  const finalHeaders = new Headers(base);
  for (const header of headers) {
    for (const [key, value] of header.entries()) {
      finalHeaders.set(key, value);
    }
  }
  return finalHeaders;
}
