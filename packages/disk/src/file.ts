import { stream2uint8array, async2stream } from "./helpers.js";

/**
 * Symbol to identify disk-managed files
 * Custom drivers can use this to mark their File instances
 */
export const kDiskFile = Symbol.for("minimajs.disk.file");

export interface DiskFileInit extends FilePropertyBag {
  /** Absolute URL/URI with protocol (e.g., file:///path, s3://bucket/key) */
  href: string;
  size?: number;
  metadata?: Record<string, string>;
  stream: () => ReadableStream | Promise<ReadableStream>;
}

export class DiskFile extends File {
  static readonly [kDiskFile] = true;

  #buffer: Uint8Array<ArrayBuffer> | null = null;
  #size: number;
  /** Absolute URL/URI with protocol identifying this file */
  readonly href: string;
  readonly metadata?: Record<string, string>;
  #streamFactory: () => ReadableStream | Promise<ReadableStream>;

  constructor(filename: string, { href, size, metadata, stream, ...propertyBag }: DiskFileInit) {
    super([], filename, propertyBag);
    this.href = href;
    this.metadata = metadata;
    this.#size = size ?? 0;
    this.#streamFactory = stream;
  }

  get size() {
    return this.#size;
  }

  stream(): ReadableStream {
    const result = this.#streamFactory();
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
    if (!this.#buffer) {
      this.#buffer = await stream2uint8array(this.stream());
    }
    return this.#buffer;
  }

  get [Symbol.toStringTag]() {
    return "DiskFile";
  }
}
