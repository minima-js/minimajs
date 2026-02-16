import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import type { DiskData, FileSource, PutOptions } from "./types.js";
import { DiskFile } from "./file.js";
import { lookup as lookupMimeType } from "mime-types";

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
 * Resolve key from string or DiskFile
 */
export function resolveKey(from: FileSource): string {
  return typeof from === "string" ? from : from.href;
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

/**
 * Resolve size from data
 */
export function resolveSize(data: DiskData): number | undefined {
  if (isBlob(data)) return data.size;
  if (isArrayBuffer(data)) return data.byteLength;
  if (isArrayBufferView(data)) return data.byteLength;
  if (typeof data === "string") return Buffer.byteLength(data);
  return undefined;
}

/**
 * Sanitize path segments to prevent directory traversal
 */
export function sanitizeKey(key: string): string {
  const segments = key
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment && segment !== "." && segment !== "..");
  return segments.join("/");
}

export function sanitizeFilename(name: string): string {
  return basename(name).replace(/\s+/g, "-");
}

export function randomName(base: string): string {
  return `${randomUUID()}-${sanitizeFilename(base)}`;
}

/**
 * Detect MIME type from file path/key using the mime-types library
 */
export function getMimeType(pathOrKey: string): string | undefined {
  const result = lookupMimeType(pathOrKey);
  return result || undefined;
}

export async function stream2uint8array(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  let buffer = new Uint8Array(64 * 1024); // 64KB initial size
  let length = 0;

  while (true) {
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
