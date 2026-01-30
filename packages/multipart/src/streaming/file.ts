import { Readable } from "node:stream";
import { stream2uint8array } from "../stream.js";

export interface StreamFileInit extends FilePropertyBag {
  stream: Readable;
  type: string;
  lastModified?: number;
}

export class StreamFile extends File {
  #stream: Readable;

  constructor(filename: string, { stream, ...propertyBag }: StreamFileInit) {
    super([], filename, propertyBag);
    this.#stream = stream;
  }

  get size() {
    return 0;
  }

  stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    return Readable.toWeb(this.toReadable());
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const buffer = await stream2uint8array(this.#stream, {});
    return buffer.buffer;
  }

  async text(): Promise<string> {
    throw new Error(".text() is not supported. Files are stream-only.");
  }

  async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return await stream2uint8array(this.#stream, {});
  }

  slice(): Blob {
    throw new Error(".slice() is not supported. Files are stream-only.");
  }

  get [Symbol.toStringTag]() {
    return "StreamFile";
  }

  /**
   * Creates a Node.js Readable stream from the temporary file.
   * Multiple streams can be created; all are tracked for cleanup.
   */
  toReadable(): Readable {
    return this.#stream;
  }

  /**
   * Loads the file into memory and returns a standard File object.
   */
  async toFile(): Promise<File> {
    const buffer = await this.bytes();
    return new File([buffer], this.name, { type: this.type, lastModified: this.lastModified });
  }

  toJSON() {
    return {
      name: this.name,
      size: this.size,
      type: this.type,
      lastModified: this.lastModified,
    };
  }
}
