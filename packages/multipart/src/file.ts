import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { stream2buffer } from "./helpers.js";
import { v4 as uuid } from "uuid";
import { extname, join } from "path";
import { tmpdir } from "os";
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

export class UploadedFile extends File {
  #streams = new Set<Readable>();
  constructor(
    info: FileInfo,
    public readonly tmpFile: string,
    private readonly signal: AbortSignal
  ) {
    super(info.field, info.filename, info.encoding, info.mimeType);
  }

  get stream(): Readable {
    const stream = createReadStream(this.tmpFile, { signal: this.signal });
    this.#streams.add(stream);
    stream.on("close", () => {
      this.#streams.delete(stream);
    });
    return stream;
  }

  async flush() {
    for (const stream of this.#streams) {
      stream.destroy();
    }
    await unlink(this.tmpFile).catch((_) => false);
  }
}
