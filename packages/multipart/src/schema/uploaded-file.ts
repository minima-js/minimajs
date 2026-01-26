import { Readable } from "node:stream";
import { readFile, unlink } from "node:fs/promises";
import { createReadStream } from "node:fs";

export interface UploadedFileInit extends FilePropertyBag {
  path: string;
  size: number;
  type?: string;
  lastModified?: number;
  signal?: AbortSignal;
}

export class UploadedFile extends File {
  #streams = new Set<Readable>();
  #size: number;
  readonly path: string;
  readonly signal?: AbortSignal;

  constructor(filename: string, { path, signal, size, ...propertyBag }: UploadedFileInit) {
    super([], filename, propertyBag);
    this.path = path;
    this.#size = size;
    this.signal = signal;
  }

  // ✅ fix incorrect size
  get size() {
    return this.#size;
  }

  // ✅ stream from disk instead of memory
  stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    return Readable.toWeb(this.nodeStream());
  }

  // ✅ load on demand
  async arrayBuffer(): Promise<ArrayBuffer> {
    const buf = await readFile(this.path);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  async text(): Promise<string> {
    return readFile(this.path, "utf8");
  }

  slice(): Blob {
    throw new Error("UploadedFile.slice() is not supported. Files are disk-backed and stream-only.");
  }

  /**
   * Creates a readable stream from the temporary file.
   * Multiple streams can be created; all are tracked for cleanup.
   */
  nodeStream(): Readable {
    const stream = createReadStream(this.path, { signal: this.signal });
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
    return unlink(this.path).catch((_) => false);
  }
}

export function isUploadedFile(f: unknown): f is UploadedFile {
  return f instanceof UploadedFile;
}
