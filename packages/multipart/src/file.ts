import { Readable } from "stream";
import { stream2buffer } from "./helpers.js";
import { v4 as uuid } from "uuid";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "fs";
import { extname, join } from "path";
import { tmpdir } from "os";
import { nullStream } from "./stream.js";

export interface FileInfo {
  readonly field: string;
  readonly filename: string;
  readonly encoding: string;
  readonly mimeType: string;
  readonly stream: Readable;
  readonly tmpFile?: string;
}

export class File implements FileInfo {
  #stream?: Readable;
  #tmpFile?: string;
  constructor(
    public readonly field: string,
    public readonly filename: string,
    public readonly encoding: string,
    public readonly mimeType: string,
    stream?: Readable,
    tmpFile?: string
  ) {
    this.#tmpFile = tmpFile;
    this.#stream = stream;
  }

  get tmpFile() {
    return this.#tmpFile;
  }

  get stream() {
    return this.#stream ?? createReadStream(this.tmpFile!);
  }

  get ext() {
    return extname(this.filename);
  }

  static create(info: FileInfo) {
    return new File(
      info.field,
      info.filename,
      info.encoding,
      info.mimeType,
      info.stream,
      info.tmpFile
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

  flush() {
    return pipeline(this.stream, nullStream());
  }
}

export function isFile(f: unknown): f is File {
  return f instanceof File;
}
