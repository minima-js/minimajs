import { mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { MultipartRawField, MultipartRawFile } from "./types.js";
import { v4 as uuid } from "uuid";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";
import { StreamFile } from "./streaming/file.js";
import { RAW_FIELD, RAW_FILE } from "./raw/index.js";

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

/** Checks if a value is a Web API File instance. */
export function isFile(f: unknown): f is File {
  return f instanceof File;
}

/** Checks if a value is a raw multipart file from the parser. */
export function isRawFile(f: any): f is MultipartRawFile {
  return f?.[RAW_FILE];
}

/** Checks if a value is a raw multipart file from the parser. */
export function isRawField(f: any): f is MultipartRawField {
  return f?.[RAW_FIELD];
}

/** Converts a raw multipart file stream into a Web API File by buffering the entire stream. */
export async function raw2file(raw: MultipartRawFile, options: Stream2uint8arrayOptions): Promise<File> {
  return new File([await stream2uint8array(raw.stream, options)], raw.filename, {
    type: raw.mimeType,
    lastModified: new Date().getTime(),
  });
}

/** Wraps a raw multipart file stream into a StreamFile without buffering. */
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

/** Saves a file or raw multipart stream to disk. */
export async function save(file: File | MultipartRawFile, dest = process.cwd(), filename?: string) {
  if (isRawFile(file)) {
    filename ??= randomName(file.filename);
    await pipeline(file.stream, createWriteStream(join(dest, filename)));
    return filename;
  }

  filename ??= randomName(file.name);
  await pipeline(file.stream(), createWriteStream(join(dest, filename)));
  return filename;
}

/** Consumes and discards a raw multipart file stream. */
export function drain(file: MultipartRawFile) {
  return pipeline(file.stream, stream2void());
}

/** Options for stream to Uint8Array conversion. */
export interface Stream2uint8arrayOptions {
  /** Maximum allowed file size in bytes. */
  fileSize?: number;
}

/** Reads a stream into a Uint8Array with optional size limit. */
export async function stream2uint8array(
  stream: Readable,
  { fileSize = Infinity }: Stream2uint8arrayOptions = {}
): Promise<Uint8Array<ArrayBuffer>> {
  let buffer = new Uint8Array(64 * 1024); // 64KB
  let length = 0;

  for await (const chunk of stream) {
    // normalize chunk
    const uint8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);

    const needed = length + uint8.byteLength;

    if (needed > fileSize) {
      stream.destroy();
      throw new Error("Body exceeds maxSize");
    }

    // grow buffer (amortized O(n))
    if (needed > buffer.byteLength) {
      let newSize = buffer.byteLength;
      while (newSize < needed) {
        newSize *= 2;
      }

      const next = new Uint8Array(newSize);
      next.set(buffer, 0);
      buffer = next;
    }

    buffer.set(uint8, length);
    length += uint8.byteLength;
  }

  return buffer.subarray(0, length);
}

/** Creates a writable stream that discards all data. */
export function stream2void() {
  return new Writable({
    write(_, _1, callback) {
      callback();
    },
  });
}

/** Reads a stream into a Buffer. */
export async function stream2buffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const buf = Array<Buffer>();
    stream.on("data", (chunk) => buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buf)));
    stream.on("error", reject);
  });
}
