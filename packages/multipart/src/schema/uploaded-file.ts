import type { Readable } from "stream";
import { File, type FileInfo } from "../file.js";
import { unlink } from "fs/promises";
import { createReadStream } from "fs";

export class UploadedFile extends File {
  #streams = new Set<Readable>();
  constructor(
    info: FileInfo,
    public readonly tmpFile: string,
    public readonly size: number,
    private readonly signal?: AbortSignal
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

  async destroy() {
    for (const stream of this.#streams) {
      stream.destroy();
    }
    await unlink(this.tmpFile).catch((_) => false);
  }
}

export function isUploadedFile(file: unknown) {
  return file instanceof UploadedFile;
}
