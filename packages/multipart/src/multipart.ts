import type { IncomingHttpHeaders } from "node:http";
import assert from "node:assert";
import { Busboy, type BusboyConfig, type BusboyHeaders } from "@fastify/busboy";
import { File } from "./file.js";
import { getRequest, type Request } from "@minimajs/server";
import { createIteratorAsync, stream2void } from "./stream.js";
import { UploadError } from "./errors.js";

type Config = Omit<BusboyConfig, "headers">;

function ensureContentType(headers: IncomingHttpHeaders): asserts headers is BusboyHeaders {
  assert("content-type" in headers, "Invalid content type or not exists in header");
}

function busboy(req: Request, opt: Config) {
  const { headers } = req;
  ensureContentType(headers);
  const bb = new Busboy({
    ...opt,
    headers,
  });
  req.raw.pipe(bb);
  return bb;
}

export async function getFile(name?: string) {
  const limits: BusboyConfig["limits"] = { fields: 0 };
  if (!name) {
    limits.files = 1;
  }
  const req = getRequest();
  return new Promise<File>((resolve, reject) => {
    const bb = busboy(req, { limits });
    bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
      if (name && uploadedName !== name) {
        file.pipe(stream2void());
        return;
      }
      resolve(new File(uploadedName, filename, encoding, mimeType, file));
    });
    bb.on("error", (er) => reject(er));
    bb.on("finish", () => reject(new UploadError("Uploaded file is invalid or not matched")));
  });
}

export function getFiles() {
  const req = getRequest();
  const [stream, iterator] = createIteratorAsync<File>();
  const bb = busboy(req, {
    limits: { fields: 0 },
  });
  bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
    stream.write(new File(uploadedName, filename, encoding, mimeType, file));
  });
  bb.on("error", (er) => stream.emit("error", er));
  return iterator();
}

export function getFields<T extends Record<string, string>>() {
  const req = getRequest();
  const values: any = {};
  const bb = busboy(req, {
    limits: { files: 0 },
  });
  bb.on("field", (name, value) => {
    values[name] = value;
  });
  return new Promise<T>((resolve, reject) => {
    bb.on("error", reject);
    bb.on("finish", () => resolve(values));
  });
}

export function getBody() {
  const req = getRequest();
  const [stream, iterator] = createIteratorAsync<[string, string | File]>();
  const bb = busboy(req, {});
  bb.on("field", (name, value) => {
    stream.push([name, value]);
  });
  bb.on("file", (name, file, filename, encoding, mimeType) => {
    stream.write([name, new File(name, filename, encoding, mimeType, file)]);
  });
  bb.on("error", (err) => stream.emit("error", err));
  bb.on("finish", () => stream.end());
  return iterator();
}
