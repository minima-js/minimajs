import type { IncomingHttpHeaders } from "node:http";
import assert from "node:assert";
import { Busboy, type BusboyConfig, type BusboyHeaders } from "@fastify/busboy";
import { File } from "./file.js";
import { getRequest, type Request } from "@minimajs/server";
import { ValidationError } from "@minimajs/server/error";
import { createIteratorAsync, stream2void } from "./stream.js";
import { UploadError } from "./errors.js";

type Config = Omit<BusboyConfig, "headers">;

function ensureContentType(headers: IncomingHttpHeaders): asserts headers is BusboyHeaders {
  assert("content-type" in headers, new ValidationError("Invalid content type or not exists in header"));
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

/**
 * Retrieves a single file from a multipart form request.
 * If a field name is provided, only files from that field are accepted.
 *
 * @param name - Optional field name to match. If provided, only files from this field are returned.
 *                If omitted, the first file from any field is returned.
 * @returns A promise that resolves to the uploaded File
 * @throws {UploadError} If no file is found or the file doesn't match the specified field name
 * @example
 * ```ts
 * // Get any file
 * const file = await getFile();
 *
 * // Get file from specific field
 * const avatar = await getFile('avatar');
 * await avatar.move('/uploads');
 * ```
 */
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

/**
 * Retrieves all files from a multipart form request as an async iterable.
 * Field data is ignored - only files are processed.
 *
 * @returns An async iterable that yields File instances
 * @example
 * ```ts
 * for await (const file of getFiles()) {
 *   console.log(file.filename);
 *   await file.move('/uploads');
 * }
 * ```
 */
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

/**
 * Retrieves all text fields from a multipart form request.
 * Files are ignored - only text field data is processed.
 *
 * @template T - The expected shape of the fields object
 * @returns A promise that resolves to an object containing field names and their values
 * @example
 * ```ts
 * const fields = await getFields<{ name: string; email: string }>();
 * console.log(fields.name, fields.email);
 * ```
 */
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

/**
 * Retrieves both text fields and files from a multipart form request as an async iterable.
 * Each iteration yields a tuple of [fieldName, value] where value can be a string or File.
 *
 * @returns An async iterable that yields tuples of field name and value (string or File)
 * @example
 * ```ts
 * for await (const [name, value] of getBody()) {
 *   if (isFile(value)) {
 *     console.log(`File: ${name} = ${value.filename}`);
 *     await value.move('/uploads');
 *   } else {
 *     console.log(`Field: ${name} = ${value}`);
 *   }
 * }
 * ```
 */
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
