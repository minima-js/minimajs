import { createAsyncIterator, stream2uint8array, stream2void } from "./stream.js";
import { busboy } from "./busboy.js";
import type { MultipartFileOptions, MultipartOptions, MultipartRawFile, MultipartRawResult } from "./types.js";
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
  export async function file(name: string, options: MultipartFileOptions = {}) {
    for await (const field of raw<MultipartRawFile>({ ...options, limits: { ...options.limits, fields: 0 } })) {
      if (field.fieldname !== name) {
        await pipeline(field.stream, stream2void());
        continue;
      }
      return raw2file(field, options);
    }
    return null;
  }
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
  export async function firstFile(options: MultipartFileOptions = {}): Promise<[field: string, file: File] | null> {
    for await (const field of raw<MultipartRawFile>({ ...options, limits: { ...options.limits, files: 1, fields: 0 } })) {
      const file = new File([await stream2uint8array(field.stream, options)], field.filename, {
        type: field.mimeType,
        lastModified: new Date().getTime(),
      });
      return [field.fieldname, file];
    }
    return null;
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
  export async function* files(options: MultipartFileOptions = {}) {
    for await (const field of raw<MultipartRawFile>({ ...options, limits: { ...options.limits, fields: 0 } })) {
      yield [field.fieldname, await raw2file(field, options)] as const;
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
  export function fields<T extends Record<string, string>>() {
    const values: any = {};
    const [bb] = busboy({
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
  export async function* body(options: MultipartFileOptions = {}): AsyncGenerator<[field: string, value: string | File]> {
    for await (const field of raw(options)) {
      if (isRawFile(field)) {
        const file = new File([await stream2uint8array(field.stream, options)], field.filename, {
          type: field.mimeType,
          lastModified: new Date().getTime(),
        });
        yield [field.fieldname, file];
        continue;
      }
      yield [field.fieldname, field.value];
    }
  }

  export function raw<T = MultipartRawResult>(options: MultipartOptions): AsyncGenerator<T> {
    const [stream, iterator] = createAsyncIterator<MultipartRawResult>();
    const [bb, stop] = busboy(options);

    bb.on("field", (fieldname, value, fieldnameTruncated, valueTruncated, transferEncoding, mimeType) => {
      stream.write({ fieldname, value, fieldnameTruncated, valueTruncated, transferEncoding, mimeType });
    });

    bb.on("file", async (fieldname, fStream, filename, transferEncoding, mimeType) => {
      stream.write({ fieldname, stream: fStream, filename, transferEncoding, mimeType });
    });

    bb.on("error", (err) => stream.emit("error", err));

    bb.on("finish", () => stream.end());

    stream.on("error", (err: any) => {
      if (err.name === "AbortError" && err.code === "ABORT_ERR") {
        stop();
      }
    });
    return iterator as AsyncGenerator<T>;
  }
}
