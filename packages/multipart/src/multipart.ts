import { Busboy, type BusboyConfig, type BusboyHeaders } from "@fastify/busboy";
import assert from "node:assert";
import type { IncomingHttpHeaders } from "node:http";
import { File, isFile, type FileInfo } from "./file.js";
import { createContext, getRequest, type Request } from "@minimajs/app";
import { asyncIterator } from "./async-iterator.js";
import { unlink } from "node:fs/promises";
import { onSent } from "@minimajs/app/hooks";
import { nullStream } from "./stream.js";

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

export function getMultipart() {
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

interface MultipartMeta {
  fields: [string, string][];
  files: [info: FileInfo, tmpFile: string][];
}

const [getMultipartMeta, setMultipartMeta] =
  createContext<MultipartMeta | null>();

export async function getUploadedBody<
  T extends object = Record<string, string | File>
>() {
  let meta = getMultipartMeta();
  if (meta) {
    return getMetaBody(meta) as T;
  }
  meta = { files: [], fields: [] };
  for await (const [name, value] of getMultipart()) {
    if (isFile(value)) {
      meta.files.push([value, await value.move()]);
      continue;
    }
    meta.fields.push([name, value]);
  }
  setMultipartMeta(meta);
  onSent(cleanup);
  return getUploadedBody();
}

function getMetaBody(meta: MultipartMeta) {
  const fields: Record<string, File | string> = {};
  meta.fields.forEach(([name, val]) => {
    fields[name] = val;
  });
  meta.files.forEach(([info, tmpFile]) => {
    fields[info.field] = File.create({
      ...info,
      tmpFile: tmpFile,
    });
  });

  return fields;
}

async function cleanup() {
  const meta = getMultipartMeta();
  if (!meta) {
    return;
  }
  for (const [, tmp] of meta.files) {
    await unlink(tmp).catch(() => {});
  }
}
