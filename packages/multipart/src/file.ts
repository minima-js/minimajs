import { Readable } from "stream";
import { stream2buffer } from "./helpers.js";
import { v4 as uuid } from "uuid";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { nullStream } from "./stream.js";

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
    public readonly stream: Readable
  ) {}

  static create(info: FileInfo & { stream: Readable }) {
    return new File(
      info.field,
      info.filename,
      info.encoding,
      info.mimeType,
      info.stream
    );
  }

  buffer() {
    return stream2buffer(this.stream);
  }

  async move(filename?: string) {
    if (!filename) {
      filename = join(tmpdir(), uuid());
    }
    await pipeline(this.stream, createWriteStream(filename));
    return filename;
  }

  consume() {
    return pipeline(this.stream, nullStream());
  }
}

export class Field {
  constructor(public readonly name: string, public readonly value: any) {}
}

export function isFile(f: unknown): f is File {
  return f instanceof File;
}
