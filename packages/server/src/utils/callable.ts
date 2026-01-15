/**
 * Type guard to check if a value is a callable function.
 * Useful for runtime type checking before invoking a value as a function.
 *
 * @example
 * ```ts
 * // Basic usage
 * if (isCallable(value)) {
 *   value(); // value is (...args: any[]) => any
 * }
 *
 * // With specific function type
 * type Options = Settings | ((ctx: Context) => string);
 * if (isCallable<(ctx: Context) => string>(options)) {
 *   // options is now typed as (ctx: Context) => string
 * }
 * ```
 */
export function isCallable(v: unknown): v is (...args: unknown[]) => unknown {
  return typeof v === "function";
}
