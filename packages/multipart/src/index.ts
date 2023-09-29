import { Busboy } from "@fastify/busboy";
import { Readable } from "stream";
import { getRequest, getHeaders } from "@minimajs/app";

export class FileInfo {
  constructor(
    public readonly filename: string,
    public readonly encoding: string,
    public readonly mimeType: string
  ) {}
}

export async function getFile<T extends string>(name: T) {
  const [req, headers] = [getRequest().raw, getHeaders()] as const;
  if (!headers["content-type"]) {
    throw new Error("Invalid content type");
  }

  return new Promise<[FileInfo, Readable]>((resolve, reject) => {
    const bb = new Busboy({
      limits: { files: 1 },
      headers: headers as any,
    });
    bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
      if (uploadedName !== name) {
        reject("Invalid filename");
      }
      resolve([new FileInfo(filename, encoding, mimeType), file]);
    });

    bb.on("error", (er) => reject(er));
    req.pipe(bb);
  });
}
