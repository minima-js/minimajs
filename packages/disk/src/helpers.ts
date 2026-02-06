import { basename } from "node:path";
import { randomUUID } from "node:crypto";
import type { DiskData, FileSource, PutOptions } from "./types.js";

export function isBlob(value: unknown): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

export function isFile(value: unknown): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

/**
 * Resolve key from string or any File with a key property
 */
export function resolveKey(from: FileSource): string {
  return typeof from === "string" ? from : from.key;
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
 * Convert DiskData to Buffer for Node.js file operations
 */
export async function toBuffer(data: DiskData): Promise<Buffer> {
  if (typeof data === "string") {
    return Buffer.from(data);
  }
  if (isArrayBuffer(data)) {
    return Buffer.from(data);
  }
  if (isArrayBufferView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (isBlob(data)) {
    return Buffer.from(await data.arrayBuffer());
  }
  if (data instanceof ReadableStream) {
    const reader = data.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported data type for disk upload");
}

/**
 * Resolve filename from key or File object
 */
export function resolveFilename(key: string, data: DiskData): string {
  // Use the key's basename as filename
  const keyBasename = basename(key);
  if (keyBasename && keyBasename !== key) {
    return sanitizeFilename(keyBasename);
  }
  // If key has no path separator, use it directly
  if (keyBasename) {
    return sanitizeFilename(keyBasename);
  }
  // Fallback to file name or random
  if (isFile(data)) return sanitizeFilename(data.name);
  return randomName("file");
}

/**
 * Resolve content type from options or data
 */
export function resolveContentType(data: DiskData, options?: PutOptions): string | undefined {
  if (options?.contentType) return options.contentType;
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
