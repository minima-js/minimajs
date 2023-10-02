import { Busboy, type BusboyConfig, type BusboyHeaders } from "@fastify/busboy";
import { AssertionError } from "node:assert";
import type { IncomingHttpHeaders } from "node:http";
import { Field, File } from "./file.js";
import { getRequest, type Request } from "@minimajs/app";
import { asyncIterator } from "./async-iterator.js";

function ensureContentType(
  headers: IncomingHttpHeaders
): asserts headers is BusboyHeaders {
  if ("content-type" in headers) {
    return;
  }
  throw new AssertionError({
    message: "Invalid content type or not exists in header",
  });
}

function busboy(req: Request, opt: Omit<BusboyConfig, "headers">) {
  const { headers } = req;
  ensureContentType(headers);
  const bb = new Busboy({
    ...opt,
    headers,
  });
  req.raw.pipe(bb);
  return bb;
}

export async function getFile<T extends string>(name: T) {
  const req = getRequest();
  return new Promise<File>((resolve, reject) => {
    const bb = busboy(req, { limits: { files: 1 } });
    bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
      if (uploadedName !== name) {
        reject("Filename not matched in the body");
      }
      resolve(new File(uploadedName, filename, encoding, mimeType, file));
    });

    bb.on("error", (er) => reject(er));
  });
}

export function getFiles() {
  const req = getRequest();
  const [stream, iterator] = asyncIterator<File>();
  const bb = busboy(req, {});
  bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
    stream.write(new File(uploadedName, filename, encoding, mimeType, file));
  });
  bb.on("error", (er) => stream.emit("error", er as any));
  return iterator;
}

export function getFields() {
  const req = getRequest();
  const [stream, iterator] = asyncIterator<Field>();
  const bb = busboy(req, {});
  bb.on("field", (fieldname, value) => {
    stream.push(new Field(fieldname, value));
  });
  bb.on("error", (err) => stream.emit("error", err as any));
  bb.on("finish", () => stream.end());
  return iterator;
}

export function getMultipart() {
  const req = getRequest();
  const [stream, iterator] = asyncIterator<Field | File>();
  const bb = busboy(req, {});
  bb.on("field", (fieldname, value) => {
    stream.push(new Field(fieldname, value));
  });
  bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
    stream.write(new File(uploadedName, filename, encoding, mimeType, file));
  });
  bb.on("error", (err) => stream.emit("error", err as any));
  bb.on("finish", () => stream.end());
  return iterator;
}
