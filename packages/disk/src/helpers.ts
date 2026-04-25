import { basename, extname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Disk, DiskDriver, DiskData, FileMetadata, FileSource, PutOptions } from "./types.js";
import { kDisk } from "./symbols.js";
import { DiskFile } from "./file.js";
import { lookup as lookupMimeType } from "mime-types";
import { DiskReadError } from "./errors.js";
import type { HookTrigger } from "./hooks/trigger.js";

/** Retrieve the originating Disk from any File (undefined if not set) */
export function getDisk<TDriver extends DiskDriver = DiskDriver>(file: File): Disk<TDriver> | undefined {
  return (file as any)[kDisk] as Disk<TDriver> | undefined;
}

/** Attach a Disk reference to a file — called internally by StandardDisk */
export function setDisk(file: File, disk: Disk): void {
  (file as any)[kDisk] = disk;
}

export function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

export function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

export function isDiskFile(value: unknown): value is DiskFile {
  return value instanceof DiskFile;
}

/**
 * Resolve a path/key from a FileSource.
 * - `DiskFile` → `.href` (storage identifier)
 * - `File` → `.name`
 * - `string` → returned as-is
 */
export function resolveKey(from: FileSource): string {
  if (typeof from === "string") return from;
  if (from instanceof DiskFile) return from.href;
  return from.name;
}

export function isArrayBuffer(value: unknown): value is ArrayBuffer {
  return value instanceof ArrayBuffer;
}

export function isArrayBufferView(value: unknown): value is ArrayBufferView {
  return ArrayBuffer.isView(value);
}

/**
 * Convert any DiskData type to a ReadableStream
 */
export function toReadableStream(data: DiskData): ReadableStream<Uint8Array> {
  if (data instanceof ReadableStream) return data as ReadableStream<Uint8Array>;
  if (isBlob(data)) return data.stream();
  if (isArrayBuffer(data)) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(data));
        controller.close();
      },
    });
  }
  if (isArrayBufferView(data)) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
        controller.close();
      },
    });
  }
  if (typeof data === "string") {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(data));
        controller.close();
      },
    });
  }
  throw new Error("Unsupported data type for disk upload");
}

/**
 * Resolve content type from options or data
 * Uses FilePropertyBag's 'type' property (web-native)
 */
export function resolveContentType(data: DiskData, options?: PutOptions): string | undefined {
  if (options?.type) return options.type;
  if (isFile(data)) return data.type || undefined;
  if (isBlob(data)) return data.type || undefined;
  return undefined;
}

export function randomName(base: string): string {
  return `${randomUUID()}-${extname(base)}`;
}

/**
 * Detect MIME type from file path/key using the mime-types library
 */
export function getMimeType(pathOrKey: string): string | undefined {
  const result = lookupMimeType(pathOrKey);
  return result || undefined;
}

export function text2stream(text: string): ReadableStream<Uint8Array> {
  const encoded = new TextEncoder().encode(text);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
}

export interface Stream2BytesOptions {
  signal?: AbortSignal;
}

export async function stream2bytes(
  stream: ReadableStream<Uint8Array>,
  options: Stream2BytesOptions = {}
): Promise<Uint8Array<ArrayBuffer>> {
  const { signal } = options;
  const reader = stream.getReader();
  let buffer = new Uint8Array(64 * 1024); // 64KB initial size
  let length = 0;

  while (true) {
    signal?.throwIfAborted();
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      const needed = length + value.byteLength;

      // Grow buffer if needed (amortized O(n))
      if (needed > buffer.byteLength) {
        let newSize = buffer.byteLength;
        while (newSize < needed) {
          newSize *= 2;
        }

        const next = new Uint8Array(newSize);
        next.set(buffer, 0);
        buffer = next;
      }

      buffer.set(value, length);
      length += value.byteLength;
    }
  }

  return buffer.subarray(0, length) as Uint8Array<ArrayBuffer>;
} /**
 * Wraps a Promise<ReadableStream> into a ReadableStream
 */
export function async2stream(streamPromise: Promise<ReadableStream>): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      try {
        const actualStream = await streamPromise;
        const reader = actualStream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

export function createDiskFile(
  filename: string,
  metadata: FileMetadata,
  factory: (file: DiskFile) => Promise<ReadableStream<Uint8Array>>
) {
  let file: DiskFile;
  // eslint-disable-next-line prefer-const
  file = new DiskFile(filename, {
    href: metadata.href,
    size: metadata.size,
    type: metadata.type || getMimeType(metadata.href),
    lastModified: metadata.lastModified,
    metadata: metadata.metadata,
    stream: () => factory(file),
  });
  return file;
}

/**
 * Copies symbol-keyed entries from `src` into `dest`.
 * Used to propagate plugin-private state through the put pipeline without
 * requiring drivers to preserve symbol keys.
 */
export function ensureMetadataSymbols(
  src: Record<string | symbol, unknown>,
  dest: Record<string | symbol, unknown> | undefined
): void {
  dest ??= {};
  for (const sym of Object.getOwnPropertySymbols(src)) {
    dest[sym] = src[sym];
  }
}

export async function fileFromMetadata(
  driver: DiskDriver,
  trigger: HookTrigger,
  metadata: FileMetadata,
  options: { signal?: AbortSignal } = {}
): Promise<DiskFile> {
  return trigger.file(basename(metadata.href), metadata, async (file) => {
    const result = await driver.get(metadata.href, options);
    if (!result) throw new DiskReadError(metadata.href);
    return trigger.streaming(result[0], file);
  });
}

type DecimalUnit = "K" | "M" | "G" | "T" | "P";
type BinaryUnit = "Ki" | "Mi" | "Gi" | "Ti" | "Pi";

type Unit = DecimalUnit | BinaryUnit;

export type ByteLiteral = `${number}${Unit}`;

export function b<T extends ByteLiteral>(strings: TemplateStringsArray, ..._expr: T[]): number {
  const input = strings[0]!; // no interpolations allowed
  return parseBytes(input);
}
const DECIMAL_BASE = 1000;
const BINARY_BASE = 1024;

const DECIMAL_MAP: Record<DecimalUnit, number> = {
  K: 1,
  M: 2,
  G: 3,
  T: 4,
  P: 5,
};

const BINARY_MAP: Record<BinaryUnit, number> = {
  Ki: 1,
  Mi: 2,
  Gi: 3,
  Ti: 4,
  Pi: 5,
};

function parseBytes(input: string): number {
  const len = input.length;

  // --- parse number ---
  let i = 0;
  while (i < len && ((input[i]! >= "0" && input[i]! <= "9") || input[i]! === ".")) {
    i++;
  }

  if (i === 0) {
    throw new Error(`Invalid byte literal: "${input}"`);
  }

  const num = Number(input.slice(0, i));
  const unit = input.slice(i) as Unit;

  if (!unit) {
    throw new Error(`Missing unit in "${input}"`);
  }

  // --- binary units (Ki, Mi, etc.) ---
  if (unit.length === 2) {
    const power = BINARY_MAP[unit as BinaryUnit];
    if (power === undefined) {
      throw new Error(`Invalid unit "${unit}" in "${input}"`);
    }
    return num * BINARY_BASE ** power;
  }

  // --- decimal units (K, M, etc.) ---
  if (unit.length === 1) {
    const power = DECIMAL_MAP[unit as DecimalUnit];
    if (power === undefined) {
      throw new Error(`Invalid unit "${unit}" in "${input}"`);
    }
    return num * DECIMAL_BASE ** power;
  }

  throw new Error(`Invalid unit "${unit}" in "${input}"`);
}
