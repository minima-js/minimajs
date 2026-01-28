import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import { readFile, unlink } from "node:fs/promises";
import { createReadStream, type ReadStream } from "node:fs";

export interface TempFileInit extends FilePropertyBag {
  path: string;
  size: number;
  type?: string;
  lastModified?: number;
  signal?: AbortSignal;
}

export class TempFile extends File {
  #streams = new Set<Readable>();
  #size: number;
  readonly path: string;
  readonly signal?: AbortSignal;

  constructor(filename: string, { path, signal, size, ...propertyBag }: TempFileInit) {
    super([], filename, propertyBag);
    this.path = path;
    this.#size = size;
    this.signal = signal;
  }

  get size() {
    return this.#size;
  }

  stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    return Readable.toWeb(this.toReadable());
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const buf = await readFile(this.path);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  async text(): Promise<string> {
    return readFile(this.path, "utf8");
  }

  async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return readFile(this.path);
  }

  slice(): Blob {
    throw new Error("TempFile.slice() is not supported. Files are disk-backed and stream-only.");
  }

  get [Symbol.toStringTag]() {
    return "TempFile";
  }

  /**
   * Creates a Node.js Readable stream from the temporary file.
   * Multiple streams can be created; all are tracked for cleanup.
   */
  toReadable(): Readable {
    const stream = createReadStream(this.path, { signal: this.signal });
    this.#streams.add(stream);
    stream.on("close", () => this.#streams.delete(stream));
    return stream;
  }

  /**
   * Loads the file into memory and returns a standard File object.
   */
  async toFile(): Promise<File> {
    const buffer = await readFile(this.path);
    return new File([buffer], this.name, { type: this.type, lastModified: this.lastModified });
  }

  toJSON() {
    return {
      name: this.name,
      size: this.size,
      type: this.type,
      lastModified: this.lastModified,
      path: this.path,
    };
  }
  /**
   * Destroys all active streams and deletes the temporary file from disk.
   * Waits for streams that are actively being consumed to finish before deleting.
   */
  async destroy(): Promise<boolean> {
    const pending: Promise<void>[] = [];

    for (const stream of this.#streams) {
      const isActive = stream.readableFlowing === true || (stream as ReadStream).bytesRead > 0;

      if (isActive) {
        // Stream is actively being consumed, wait for it to finish
        pending.push(finished(stream));
      } else {
        // Stream hasn't started, safe to destroy immediately
        stream.destroy();
      }
    }
    try {
      await Promise.allSettled(pending);
      await unlink(this.path);
    } catch {
      return false;
    }
    return true;
  }
}

export function isUploadedFile(f: unknown): f is TempFile {
  return f instanceof TempFile;
}
