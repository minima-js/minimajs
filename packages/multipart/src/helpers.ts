import { mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { MultipartRawFile } from "./types.js";
import { stream2uint8array, stream2void, type Stream2uint8arrayOptions } from "./stream.js";
import type { TempFile } from "./schema/file.js";
import { v4 as uuid } from "uuid";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { StreamFile } from "./streaming/file.js";

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

export function isFile(f: unknown): f is File {
  return f instanceof File;
}

export function isRawFile(f: any): f is MultipartRawFile {
  return "filename" in f && f.stream instanceof Readable;
}

export async function raw2file(raw: MultipartRawFile, options: Stream2uint8arrayOptions): Promise<File> {
  return new File([await stream2uint8array(raw.stream, options)], raw.filename, {
    type: raw.mimeType,
    lastModified: new Date().getTime(),
  });
}

export function raw2streamFile(raw: MultipartRawFile): StreamFile {
  return new StreamFile(raw.filename, {
    stream: raw.stream,
    type: raw.mimeType,
    lastModified: new Date().getTime(),
  });
}
/**
 * Generates a random UUID-based filename while preserving the original extension.
 * Useful for storing files with unique names to prevent collisions.
 * @returns A UUID filename with the original file extension
 */
export function randomName(filename: string) {
  return `${uuid()}${extname(filename)}`;
}

export async function move(file: File | TempFile | MultipartRawFile, dest = process.cwd(), filename?: string) {
  if (isRawFile(file)) {
    filename ??= randomName(file.filename);
    await pipeline(file.stream, createWriteStream(join(dest, filename)));
    return filename;
  }

  filename ??= randomName(file.name);
  await pipeline(file.stream(), createWriteStream(join(dest, filename)));
  return filename;
}

export function drain(file: MultipartRawFile) {
  return pipeline(file.stream, stream2void());
}
