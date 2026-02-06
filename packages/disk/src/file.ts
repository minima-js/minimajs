import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";

export interface DiskFileInit extends FilePropertyBag {
  key: string;
  url?: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, string>;
  path?: string;
  stream?: () => ReadableStream;
}

export class DiskFile extends File {
  #buffer: Uint8Array<ArrayBuffer> | null = null;
  #size: number;
  readonly key: string;
  readonly url?: string;
  readonly metadata?: Record<string, string>;
  readonly path?: string;
  #streamFactory?: () => ReadableStream;

  constructor(filename: string, { key, url, size, mimeType, metadata, path, stream, ...propertyBag }: DiskFileInit) {
    super([], filename, { type: mimeType, ...propertyBag });
    this.key = key;
    this.url = url;
    this.metadata = metadata;
    this.path = path;
    this.#size = size ?? 0;
    this.#streamFactory = stream;
  }

  get size() {
    return this.#size;
  }

  stream(): ReadableStream {
    if (this.#streamFactory) {
      return this.#streamFactory();
    }
    if (this.path) {
      return Readable.toWeb(createReadStream(this.path)) as ReadableStream;
    }
    return new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
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
      if (this.path) {
        this.#buffer = await readFile(this.path);
      } else {
        this.#buffer = await readStreamToBytes(this.stream() as ReadableStream<Uint8Array>);
      }
    }
    return this.#buffer;
  }

  get [Symbol.toStringTag]() {
    return "DiskFile";
  }
}

async function readStreamToBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }

  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return buffer as Uint8Array<ArrayBuffer>;
}
