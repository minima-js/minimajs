/**
 * Type guard to check if a value is a callable function.
 * Useful for runtime type checking before invoking a value as a function.
 */
export function isCallable(v: unknown): v is CallableFunction {
  return typeof v === "function";
}
