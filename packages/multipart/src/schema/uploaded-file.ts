import type { Readable } from "node:stream";
import { File, type FileInfo } from "../file.js";
import { unlink } from "node:fs/promises";
import { createReadStream } from "node:fs";

/**
 * Represents a validated and uploaded file that has been saved to temporary storage.
 * Used with schema validation for multipart uploads.
 */
export class UploadedFile extends File {
  #streams = new Set<Readable>();
  constructor(
    info: FileInfo,
    public readonly tmpFile: string,
    public readonly size: number,
    private readonly signal?: AbortSignal
  ) {
    super(info.field, info.filename, info.encoding, info.mimeType);
  }

  /**
   * Creates a readable stream from the temporary file.
   * Multiple streams can be created; all are tracked for cleanup.
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
   * Destroys all active streams and deletes the temporary file from disk.
   */
  async destroy() {
    for (const stream of this.#streams) {
      stream.destroy();
    }
    await unlink(this.tmpFile).catch((_) => false);
  }
}

/**
 * Type guard to check if a value is an UploadedFile instance.
 *
 * @example
 * ```ts
 * if (isUploadedFile(file)) {
 *   console.log(file.tmpFile);
 * }
 * ```
 */
export function isUploadedFile(file: unknown) {
  return file instanceof UploadedFile;
}
