/**
 * Type guard to check if a value is a callable function.
 * Useful for runtime type checking before invoking a value as a function.
 * Preserves the original function type when used with union types.
 *
 * @example
 * ```ts
 * // Basic usage
 * if (isCallable(value)) {
 *   value(); // value is (...args: any[]) => any
 * }
 *
 * // Preserves union function type
 * type Config = { name: string } | ((ctx: Context) => { name: string });
 * declare const config: Config;
 *
 * if (isCallable(config)) {
 *   const result = config(ctx); // result is { name: string }
 * } else {
 *   config.name; // config is { name: string }
 * }
 * ```
 */
export function isCallable<T>(v: T): v is Extract<NonNullable<T>, (...args: any[]) => any> {
  return typeof v === "function";
}
