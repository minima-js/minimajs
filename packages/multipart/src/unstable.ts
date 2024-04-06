import { defer } from "@minimajs/server";
import { createContext, getSignal } from "@minimajs/server/context";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { v4 as uuid } from "uuid";
import { isFile, File, type FileInfo } from "./file.js";
import { getBody } from "./multipart.js";
import type { Readable } from "node:stream";
import { unlink } from "node:fs/promises";
import { createReadStream } from "node:fs";

export class UploadedFile extends File {
  #streams = new Set<Readable>();
  constructor(info: FileInfo, public readonly tmpFile: string, private readonly signal: AbortSignal) {
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

type UploadedBody = Record<string, string | UploadedFile>;

const [getMultipartMeta, setMultipartMeta] = createContext<UploadedBody | null>();

export async function getUploadedBody<T extends UploadedBody = UploadedBody>(): Promise<T> {
  const body = getMultipartMeta() as T;
  if (body) {
    return body;
  }
  const signal = getSignal();
  const newBody = {} as any;
  for await (const [name, value] of getBody()) {
    if (isFile(value)) {
      const filename = await value.move(tmpdir(), uuid());
      newBody[name] = new UploadedFile(value, join(tmpdir(), filename), signal);
      continue;
    }
    newBody[name] = value;
  }
  setMultipartMeta(newBody);
  defer(cleanup);
  return newBody;
}

async function cleanup() {
  const body = getMultipartMeta();
  if (!body) {
    return;
  }
  for (const [, file] of Object.entries(body)) {
    if (!isFile(file)) {
      continue;
    }
    await file.flush();
  }
}
