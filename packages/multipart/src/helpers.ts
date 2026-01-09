import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Array of binary file size units.
 * @internal
 */
export const units = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"] as const;

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
