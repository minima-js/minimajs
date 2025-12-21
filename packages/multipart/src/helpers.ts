import { mkdir } from "fs/promises";
import { resolve } from "path";

const units = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"] as const;

/**
 * File size unit type representing binary prefixes (base 1024).
 * Available units: KiB, MiB, GiB, TiB, PiB, EiB, ZiB, YiB
 */
export type Unit = (typeof units)[number];

/**
 * Generic dictionary type alias for objects with optional properties.
 * @template T - The type of values in the dictionary
 */
export type Dict<T = any> = NodeJS.Dict<T>;

const thresh = 1024;

/**
 * Converts a size value with a binary unit to bytes.
 *
 * @example
 * ```ts
 * getBytes(5, 'MiB'); // Returns 5242880 (5 * 1024 * 1024)
 * getBytes(1, 'GiB'); // Returns 1073741824
 * ```
 */
export function getBytes(size: number, multiplier: Unit) {
  for (const bn of units) {
    size *= thresh;
    if (multiplier === bn) {
      return size;
    }
  }
  return size;
}

/**
 * Converts a byte count into a human-readable file size string with binary units.
 *
 * @example
 * ```ts
 * humanFileSize(1024); // "1.0 KiB"
 * humanFileSize(1536, 2); // "1.50 KiB"
 * humanFileSize(5242880); // "5.0 MiB"
 * ```
 */
export function humanFileSize(bytes: number, dp = 1) {
  if (bytes === Infinity) {
    return "Infinity";
  }
  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + " " + units[u];
}

/**
 * Sets a property on an object and returns the object.
 * Helper for immutable-style chaining operations.
 *
 * @example
 * ```ts
 * const obj = {};
 * set(obj, 'name', 'John'); // { name: 'John' }
 * ```
 */
export function set(obj: Record<PropertyKey, unknown>, key: PropertyKey, value: unknown) {
  obj[key] = value;
  return obj;
}

/**
 * Appends values to an array property on an object.
 * If the property doesn't exist or isn't an array, it initializes it as an array.
 *
 * @example
 * ```ts
 * const obj = {};
 * append(obj, 'items', 'a', 'b'); // { items: ['a', 'b'] }
 * append(obj, 'items', 'c'); // { items: ['a', 'b', 'c'] }
 * ```
 */
export function append(obj: Record<PropertyKey, unknown>, key: PropertyKey, ...value: unknown[]) {
  if (!obj[key]) {
    obj[key] = [];
  }
  (obj[key] as unknown[]).push(...value);
  return value;
}

/**
 * Ensures a directory path exists, creating it recursively if needed.
 *
 * @example
 * ```ts
 * const dir = await ensurePath('/uploads', 'images');
 * // Creates /uploads/images if it doesn't exist
 * ```
 */
export async function ensurePath(...paths: string[]) {
  const dest = resolve(...paths);
  await mkdir(dest, { recursive: true });
  return dest;
}
