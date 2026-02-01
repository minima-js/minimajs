import { pipeline } from "node:stream/promises";
import type { MultipartOptions, MultipartRawFile, MultipartRawResult } from "../types.js";
import { busboy } from "./busboy.js";
import { createAsyncIterator } from "../stream.js";
import { stream2void } from "../helpers.js";
export * from "./busboy.js";

export const RAW_FILE = Symbol("minimajs.multipart.raw-file");
export const RAW_FIELD = Symbol("minimajs.multipart.raw-field");

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
export async function file(name: string, options: MultipartOptions = {}): Promise<MultipartRawFile | null> {
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
        [RAW_FILE]: true,
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
export async function firstFile(options: MultipartOptions = {}): Promise<MultipartRawFile | null> {
  return new Promise<MultipartRawFile | null>((resolve, reject) => {
    const [bb] = busboy({ ...options, limits: { ...options.limits, files: 1, fields: 0 } });
    bb.on("file", (fieldname, stream, filename, transferEncoding, mimeType) => {
      resolve({
        fieldname,
        stream,
        filename,
        transferEncoding,
        mimeType,
        [RAW_FILE]: true,
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

export function files(options: MultipartOptions = {}): AsyncGenerator<MultipartRawFile> {
  const [stream, iterator] = createAsyncIterator<MultipartRawFile>();
  const { limits } = options;
  const [bb, stop] = busboy({ ...options, limits: { ...limits, fields: 0 } });

  bb.on("file", (fieldname, fStream, filename, transferEncoding, mimeType) => {
    stream.write({ fieldname, stream: fStream, filename, transferEncoding, mimeType, [RAW_FILE]: true });
  });

  bb.on("error", (err) => stream.emit("error", err));

  bb.on("finish", () => stream.end());

  stream.on("error", () => {
    stop();
  });

  return iterator as AsyncGenerator<MultipartRawFile>;
}
/**
 * Retrieves both text fields and files from a multipart form request as an async iterable.
 * Each iteration yields a MultipartRawResult (either MultipartRawFile or MultipartRawField).
 *
 * @returns An async iterable that yields raw multipart results
 * @example
 * ```ts
 * for await (const body of multipart.raw()) {
 *   if (isRawFile(body)) {
 *     console.log(`File: ${body.fieldname} = ${body.filename}`);
 *     await helpers.save(body, './dest');
 *   } else {
 *     console.log(`Field: ${body.fieldname} = ${body.value}`);
 *   }
 * }
 * ```
 */
export function body<T = MultipartRawResult>(options: MultipartOptions = {}): AsyncGenerator<T> {
  const [stream, iterator] = createAsyncIterator<MultipartRawResult>();
  const [bb, stop] = busboy(options);

  bb.on("field", (fieldname, value, fieldnameTruncated, valueTruncated, transferEncoding, mimeType) => {
    stream.write({ [RAW_FIELD]: true, fieldname, value, fieldnameTruncated, valueTruncated, transferEncoding, mimeType });
  });

  bb.on("file", (fieldname, fStream, filename, transferEncoding, mimeType) => {
    stream.write({ [RAW_FILE]: true, fieldname, stream: fStream, filename, transferEncoding, mimeType });
  });

  bb.on("error", (err) => stream.emit("error", err));

  bb.on("finish", () => stream.end());

  stream.on("error", () => {
    stop();
  });
  return iterator as AsyncGenerator<T>;
}
