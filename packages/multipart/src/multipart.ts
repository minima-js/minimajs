import type { IncomingHttpHeaders } from "node:http";
import assert from "node:assert";
import { Busboy, type BusboyConfig, type BusboyHeaders } from "@fastify/busboy";
import { File, isFile, UploadedFile } from "./file.js";
import { createContext, getRequest, type Request } from "@minimajs/app";
import { asyncIterator } from "./async-iterator.js";
import { onSent } from "@minimajs/app/hooks";
import { nullStream } from "./stream.js";
import { getSignal } from "@minimajs/app/context";

function ensureContentType(
  headers: IncomingHttpHeaders
): asserts headers is BusboyHeaders {
  assert(
    "content-type" in headers,
    "Invalid content type or not exists in header"
  );
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
    const bb = busboy(req, { limits: { fields: 0 } });
    bb.on("file", (uploadedName, file, filename, encoding, mimeType) => {
      if (uploadedName !== name) {
        file.pipe(nullStream());
        return;
      }
      resolve(new File(uploadedName, filename, encoding, mimeType, file));
    });
    bb.on("error", (er) => reject(er));
  });
}

export function getFiles() {
  const req = getRequest();
  const [stream, iterator] = asyncIterator<File>();
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
  const [stream, iterator] = asyncIterator<[string, string | File]>();
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

type UploadedBody = Record<string, string | UploadedFile>;

const [getMultipartMeta, setMultipartMeta] =
  createContext<UploadedBody | null>();

export async function getUploadedBody() {
  let body = getMultipartMeta();
  if (body) {
    return body;
  }
  const signal = getSignal();
  body = {};
  for await (const [name, value] of getBody()) {
    if (isFile(value)) {
      body[name] = new UploadedFile(value, await value.move(), signal);
      continue;
    }
    body[name] = value;
  }
  setMultipartMeta(body);
  onSent(cleanup);
  return body;
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
