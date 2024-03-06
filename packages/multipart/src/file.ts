import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

import { stream2buffer } from "./helpers.js";
import { v4 as uuid } from "uuid";
import { extname, join } from "path";
import { nullStream } from "./stream.js";
import assert from "node:assert";

export interface FileInfo {
  readonly field: string;
  readonly filename: string;
  readonly encoding: string;
  readonly mimeType: string;
  readonly stream: Readable;
}

export class File implements FileInfo {
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

  static create(info: FileInfo, _: any) {
    return new File(
      info.field,
      info.filename,
      info.encoding,
      info.mimeType,
      info.stream
    );
  }

  get stream() {
    assert(this._stream, "stream is empty");
    return this._stream;
  }

  buffer() {
    return stream2buffer(this.stream);
  }

  async move(dir = process.cwd(), filename?: string) {
    if (!filename) {
      filename = `${uuid()}.${this.ext}`;
    }
    await pipeline(this.stream, createWriteStream(join(dir, filename)));
    return filename;
  }

  flush() {
    return pipeline(this.stream, nullStream());
  }
}

export function isFile(f: unknown): f is File {
  return f instanceof File;
}
