export function isAsyncIterator<T>(obj: unknown): obj is AsyncIterable<T> {
  if (!isObject(obj)) return false;
  const method = obj[Symbol.asyncIterator];
  if (typeof method != "function") return false;
  const aIter = method.call(obj);
  return aIter === obj;
}

export function isObject(data: unknown): data is Record<string | symbol, unknown> {
  return Object(data) === data;
}

export function toArray<T>(value: T | T[]): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [value];
}
