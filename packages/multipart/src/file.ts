import assert from "node:assert";
import { type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { extname, join } from "node:path";
import { createWriteStream } from "node:fs";

import { v4 as uuid } from "uuid";
import { stream2void, stream2buffer } from "./stream.js";

export interface FileInfo {
  readonly field: string;
  readonly filename: string;
  readonly encoding: string;
  readonly mimeType: string;
  readonly stream: Readable;
}

export class File implements FileInfo {
  #randomName?: string;
  #buffer?: Buffer;
  constructor(
    public readonly field: string,
    public readonly filename: string,
    public readonly encoding: string,
    public readonly mimeType: string,
    private readonly _stream?: Readable
  ) {}

  get ext() {
    return extname(this.filename);
  }

  get randomName() {
    this.#randomName ??= `${uuid()}.${this.ext}`;
    return this.#randomName;
  }

  static create(info: FileInfo, _: any) {
    return new File(info.field, info.filename, info.encoding, info.mimeType, info.stream);
  }

  get stream() {
    assert(this._stream, "stream is empty");
    return this._stream;
  }

  async buffer() {
    this.#buffer ??= await stream2buffer(this.stream);
    return this.#buffer;
  }

  async move(dir = process.cwd(), filename = this.randomName) {
    await pipeline(this.stream, createWriteStream(join(dir, filename)));
    return filename;
  }

  flush() {
    return pipeline(this.stream, stream2void());
  }
}

export function isFile(f: unknown): f is File {
  return f instanceof File;
}
