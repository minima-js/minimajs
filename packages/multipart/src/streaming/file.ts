import { Readable } from "node:stream";
import { stream2uint8array } from "../helpers.js";

export interface StreamFileInit extends FilePropertyBag {
  stream: Readable;
  type: string;
  lastModified?: number;
}

/** A File subclass that lazily buffers from a stream on first read. */
export class StreamFile extends File {
  #stream: Readable | null;
  #buffer: Uint8Array<ArrayBuffer> | null = null;

  constructor(filename: string, { stream, ...propertyBag }: StreamFileInit) {
    super([], filename, propertyBag);
    this.#stream = stream;
  }

  get size() {
    return this.#buffer?.byteLength ?? Infinity;
  }

  stream(): ReadableStream<Uint8Array<ArrayBuffer>> {
    if (!this.#stream) {
      throw new Error("stream already consumed");
    }
    return Readable.toWeb(this.#stream);
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const bytes = await this.bytes();
    return bytes.buffer;
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(await this.bytes());
  }

  async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    if (!this.#buffer) {
      if (!this.#stream) throw new Error("stream already consumed");
      this.#buffer = await stream2uint8array(this.#stream, {});
      this.#stream = null;
    }
    return this.#buffer;
  }

  slice(): Blob {
    throw new Error(".slice() is not supported");
  }

  get [Symbol.toStringTag]() {
    return "StreamFile";
  }

  /** Creates a Node.js Readable stream from the buffered content. */
  toReadable(): Readable | null {
    return this.#stream;
  }

  /** Loads the file into memory and returns a standard File object. */
  async toFile(): Promise<File> {
    return new File([await this.bytes()], this.name, {
      type: this.type,
      lastModified: this.lastModified,
    });
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
