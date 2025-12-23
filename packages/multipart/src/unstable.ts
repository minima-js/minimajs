/**
 * This module provides experimental features for handling multipart form data,
 * including automatic file uploads to temporary storage with cleanup capabilities.
 *
 * @experimental This module is experimental and may change. Use with caution.
 *
 * @module @minimajs/multipart/unstable
 *
 *
 * @example
 * ```ts
 * import { getUploadedBody, UploadedFile } from '@minimajs/multipart/unstable';
 *
 * const body = await getUploadedBody<{
 *   name: string;
 *   avatar: UploadedFile;
 * }>();
 *
 * console.log(body.name);
 * console.log(body.avatar.tmpFile);
 * // Files are automatically cleaned up after request
 * ```
 */
import { createReadStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { Readable } from "node:stream";
import { v4 as uuid } from "uuid";
import { defer, request } from "@minimajs/server";
import { createContext } from "@minimajs/server";
import { isFile, File, type FileInfo } from "./file.js";
import { multipart } from "./multipart.js";

/**
 * Represents a file that has been uploaded and saved to a temporary location.
 * Extends File with automatic cleanup capabilities.
 *
 * @experimental This API is experimental and may change.
 */
export class UploadedFile extends File {
  #streams = new Set<Readable>();
  constructor(
    info: FileInfo,
    public readonly tmpFile: string,
    public readonly size: number,
    private readonly signal: AbortSignal
  ) {
    super(info.field, info.filename, info.encoding, info.mimeType);
  }

  /**
   * Creates a readable stream from the temporary file.
   * Streams are tracked and can be destroyed when the file is cleaned up.
   */
  get stream(): Readable {
    const stream = createReadStream(this.tmpFile, { signal: this.signal });
    this.#streams.add(stream);
    stream.on("close", () => {
      this.#streams.delete(stream);
    });
    return stream;
  }

  /**
   * Destroys all active streams and deletes the temporary file.
   */
  async destroy() {
    for (const stream of this.#streams) {
      stream.destroy();
    }
    await unlink(this.tmpFile).catch((_) => false);
  }
}

/**
 * Uploaded multipart body type.
 * Maps field names to either string values or uploaded files.
 */
export type UploadedBody = Record<string, string | UploadedFile>;

const [getMultipartMeta, setMultipartMeta] = createContext<UploadedBody | null>();

/**
 * Retrieves multipart form data and automatically saves files to temporary storage.
 * Files are moved to the system's temp directory and wrapped in UploadedFile instances.
 * Temporary files are automatically cleaned up when the request completes.
 *
 * @experimental This API is experimental and may change.
 * @example
 * ```ts
 * const body = await getUploadedBody<{
 *   name: string;
 *   avatar: UploadedFile;
 * }>();
 *
 * console.log(body.name);
 * console.log(body.avatar.tmpFile);
 * // Files are automatically cleaned up after request
 * ```
 */
export async function getUploadedBody<T extends UploadedBody = UploadedBody>(): Promise<T> {
  const body = getMultipartMeta() as T;
  if (body) {
    return body;
  }
  const signal = request.signal();
  const newBody = {} as any;
  for await (const [name, value] of multipart.body()) {
    if (isFile(value)) {
      const filename = await value.move(tmpdir(), uuid());
      newBody[name] = new UploadedFile(value, join(tmpdir(), filename), 0, signal);
      continue;
    }
    newBody[name] = value;
  }
  setMultipartMeta(newBody);
  defer(cleanup);
  return newBody;
}

async function cleanup() {
  const body = getMultipartMeta();
  if (!body) {
    return;
  }
  for (const [, file] of Object.entries(body)) {
    if (!isFile(file)) {
      continue;
    }
    await file.flush();
  }
}
