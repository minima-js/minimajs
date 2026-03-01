import { inspect } from "node:util";
import { stream2bytes, async2stream } from "./helpers.js";

export type StreamFactory = (file: DiskFile) => ReadableStream<Uint8Array> | Promise<ReadableStream<Uint8Array>>;
/**
 * Symbol to identify disk-managed files
 * Custom drivers can use this to mark their File instances
 */

export interface DiskFileInit extends FilePropertyBag {
  /** Absolute URL/URI with protocol (e.g., file:///path, s3://bucket/key) */
  href: string;
  size: number;
  metadata?: DiskFile["metadata"];
  stream: StreamFactory;
}

export class DiskFile extends File {
  #bytes: Uint8Array<ArrayBuffer> | null = null;
  #size: number;
  /** Absolute URL/URI with protocol identifying this file */
  readonly href: string;
  readonly metadata: Record<string, string> & Record<symbol, unknown> = {};
  #streamFactory: StreamFactory;

  constructor(filename: string, { href, size, metadata, stream, ...propertyBag }: DiskFileInit) {
    super([], filename, propertyBag);
    this.href = href;

    // metadata from DiskFileInit is string-based and stored in driver
    this.#size = size;
    this.#streamFactory = stream;
    if (metadata) {
      this.metadata = metadata;
    }
  }

  get size() {
    return this.#size;
  }

  stream(): ReadableStream {
    const result = this.#streamFactory(this);
    // If async, wrap it in a ReadableStream
    if (result instanceof Promise) {
      return async2stream(result);
    }
    return result;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const buf = await this.bytes();
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  async text(): Promise<string> {
    return new TextDecoder().decode(await this.bytes());
  }

  async bytes(): Promise<Uint8Array<ArrayBuffer>> {
    if (!this.#bytes) {
      this.#bytes = await stream2bytes(this.stream());
    }
    return this.#bytes;
  }

  // Custom inspect for console.log() in Node.js/Bun - match native File format
  [inspect.custom]() {
    const sizeKB = (this.size / 1024).toFixed(2);
    return {
      name: this.name,
      type: this.type,
      href: this.href,
      lastModified: this.lastModified,
      [Symbol.toStringTag]: `DiskFile (${sizeKB} KB)`,
    };
  }

  get [Symbol.toStringTag]() {
    const sizeKB = (this.size / 1024).toFixed(2);
    return `DiskFile (${sizeKB} KB)`;
  }
}
