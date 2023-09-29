export function isCallable(v: unknown): v is CallableFunction {
  return typeof v === "function";
}
