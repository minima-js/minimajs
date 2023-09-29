import { Busboy, type BusboyHeaders } from "@fastify/busboy";
import { Readable } from "stream";
import { getRequest, getHeaders } from "@minimajs/app";
import type { IncomingHttpHeaders } from "node:http";
import { AssertionError } from "assert";

export class FileInfo {
  constructor(
    public readonly filename: string,
    public readonly encoding: string,
    public readonly mimeType: string
  ) {}
}

function assertContentType(
  headers: IncomingHttpHeaders
): asserts headers is BusboyHeaders {
  if ("content-type" in headers) {
    return;
  }
  throw new AssertionError({
    message: "Invalid content type or not exists in header",
  });
}

export async function getFile<T extends string>(name: T) {
  const [req, headers] = [getRequest().raw, getHeaders()] as const;
  assertContentType(headers);
  return new Promise<[FileInfo, Readable]>((resolve, reject) => {
    const bb = new Busboy({
      limits: { files: 1 },
      headers,
    });
    bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
      if (uploadedName !== name) {
        reject("Filename not matched in the body");
      }
      resolve([new FileInfo(filename, encoding, mimeType), file]);
    });

    bb.on("error", (er) => reject(er));
    req.pipe(bb);
  });
}
