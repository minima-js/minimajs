import { createAsyncIterator, stream2void } from "./stream.js";
import { busboy } from "./busboy.js";
import type { MultipartOptions, MultipartRawFile, MultipartRawResult } from "./types.js";
import { isRawFile, raw2file } from "./helpers.js";
import { pipeline } from "node:stream/promises";

export namespace multipart {
  /**
   * Retrieves a single file from a multipart form request.
   * If a field name is provided, only files from that field are accepted.
   *
   * @param name - field name to match. If provided, only files from this field are returned.
   *                If omitted, the first file from any field is returned.
   * @returns A promise that resolves to the uploaded File
   * @throws {UploadError} If no file is found or the file doesn't match the specified field name
   * @example
   * ```ts
   * // Get any file
   * const file = await multipart.file();
   *
   * // Get file from specific field
   * const avatar = await multipart.file('avatar');
   * await avatar.move('/uploads');
   * ```
   */
  export async function file(name: string, options: MultipartOptions = {}) {
    const field = await rawFile(name, options);
    if (!field) return null;
    return raw2file(field, options.limits ?? {});
  }
  /**
   * Retrieves a raw file stream from a multipart form request without buffering into memory.
   * Useful for streaming large files directly to disk or other destinations.
   *
   * @param name - field name to match
   * @returns A promise that resolves to the raw file with stream, or null if not found
   * @example
   * ```ts
   * const raw = await multipart.rawFile('video');
   * if (raw) {
   *   await pipeline(raw.stream, createWriteStream(`/uploads/${raw.filename}`));
   * }
   * ```
   */
  export async function rawFile(name: string, options: MultipartOptions = {}): Promise<MultipartRawFile | null> {
    return new Promise<MultipartRawFile | null>((resolve, reject) => {
      const { limits } = options;
      const [bb, stop] = busboy({ ...options, limits: { ...limits, fields: 0 } });
      bb.on("file", (fieldname, stream, filename, transferEncoding, mimeType) => {
        if (fieldname !== name) {
          pipeline(stream, stream2void()).catch(() => {});
          return;
        }
        resolve({
          fieldname,
          stream,
          filename,
          transferEncoding,
          mimeType,
        });
        stream.on("end", stop);
      });
      bb.on("error", (err) => {
        reject(err);
      });
      bb.on("finish", () => {
        resolve(null);
      });
    });
  }

  /**
   * Retrieves the first file from a multipart form request.
   *
   * @returns A promise that resolves to a tuple of [fieldName, File] or null if no file is found
   * @example
   * ```ts
   * const result = await multipart.firstFile();
   * if (result) {
   *   const [fieldName, file] = result;
   *   console.log(`Received ${file.name} from field ${fieldName}`);
   * }
   * ```
   */
  export async function firstFile(options: MultipartOptions = {}): Promise<[field: string, file: File] | null> {
    const field = await firstRawFile(options);
    if (!field) return null;
    return [field.fieldname, await raw2file(field, options.limits ?? {})];
  }

  /**
   * Retrieves the first raw file stream from a multipart form request without buffering.
   *
   * @returns A promise that resolves to the first raw file with stream, or null if no file is found
   * @example
   * ```ts
   * const raw = await multipart.firstRawFile();
   * if (raw) {
   *   return response(Readable.toWeb(raw.stream), {
   *     headers: { 'Content-Type': raw.mimeType }
   *   });
   * }
   * ```
   */
  export async function firstRawFile(options: MultipartOptions = {}): Promise<MultipartRawFile | null> {
    return new Promise<MultipartRawFile | null>((resolve, reject) => {
      const [bb] = busboy({ ...options, limits: { ...options.limits, files: 1, fields: 0 } });
      bb.on("file", (fieldname, stream, filename, transferEncoding, mimeType) => {
        resolve({
          fieldname,
          stream,
          filename,
          transferEncoding,
          mimeType,
        });
      });
      bb.on("error", (err) => {
        reject(err);
      });
      bb.on("finish", () => {
        resolve(null);
      });
    });
  }

  /**
   * Retrieves all files from a multipart form request as an async iterable.
   * Field data is ignored - only files are processed.
   *
   * @returns An async iterable that yields File instances
   * @example
   * ```ts
   * for await (const file of multipart.files()) {
   *   console.log(file.filename);
   *   await file.move('/uploads');
   * }
   * ```
   */
  export async function* files(options: MultipartOptions = {}) {
    const { limits = {} } = options;
    for await (const field of raw<MultipartRawFile>({ ...options, limits: { ...limits, fields: 0 } })) {
      yield [field.fieldname, await raw2file(field, limits)] as const;
    }
  }

  /**
   * Retrieves all text fields from a multipart form request.
   * Files are ignored - only text field data is processed.
   *
   * @template T - The expected shape of the fields object
   * @returns A promise that resolves to an object containing field names and their values
   * @example
   * ```ts
   * const fields = await multipart.fields<{ name: string; email: string }>();
   * console.log(fields.name, fields.email);
   * ```
   */
  export function fields<T extends Record<string, string | string[]>>() {
    const values: any = {};
    const [bb] = busboy({
      limits: { files: 0 },
    });
    bb.on("field", (name, value) => {
      if (values[name] !== undefined) {
        values[name] = Array.isArray(values[name]) ? [...values[name], value] : [values[name], value];
      } else {
        values[name] = value;
      }
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
   * for await (const [name, value] of multipart.body()) {
   *   if (isFile(value)) {
   *     console.log(`File: ${name} = ${value.filename}`);
   *     await value.move('/uploads');
   *   } else {
   *     console.log(`Field: ${name} = ${value}`);
   *   }
   * }
   * ```
   */
  export async function* body(options: MultipartOptions = {}): AsyncGenerator<[field: string, value: string | File]> {
    for await (const field of raw(options)) {
      if (isRawFile(field)) {
        yield [field.fieldname, await raw2file(field, { fileSize: options.limits?.fileSize ?? Infinity })];
        continue;
      }
      yield [field.fieldname, field.value];
    }
  }

  export function raw<T = MultipartRawResult>(options: MultipartOptions = {}): AsyncGenerator<T> {
    const [stream, iterator] = createAsyncIterator<MultipartRawResult>();
    const [bb, stop] = busboy(options);

    bb.on("field", (fieldname, value, fieldnameTruncated, valueTruncated, transferEncoding, mimeType) => {
      stream.write({ fieldname, value, fieldnameTruncated, valueTruncated, transferEncoding, mimeType });
    });

    bb.on("file", (fieldname, fStream, filename, transferEncoding, mimeType) => {
      stream.write({ fieldname, stream: fStream, filename, transferEncoding, mimeType });
    });

    bb.on("error", (err) => stream.emit("error", err));

    bb.on("finish", () => stream.end());

    stream.on("error", () => {
      stop();
    });
    return iterator as AsyncGenerator<T>;
  }
}
