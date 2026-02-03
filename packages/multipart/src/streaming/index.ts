import type { MultipartOptions } from "../types.js";
import { isRawFile, raw2streamFile } from "../helpers.js";
import * as raw from "../raw/index.js";
import type { StreamFile } from "./file.js";

export * from "./file.js";
/** Retrieves a specific file field by name as a StreamFile (lazy streaming, not buffered). */
export async function file(name: string, options: MultipartOptions = {}): Promise<StreamFile | null> {
  const field = await raw.file(name, options);
  if (!field) return field;
  return raw2streamFile(field);
}

/** Retrieves the first file field as a StreamFile with its field name. */
export async function firstFile(options: MultipartOptions = {}): Promise<[field: string, file: StreamFile] | null> {
  const field = await raw.firstFile(options);
  if (!field) return null;
  return [field.fieldname, raw2streamFile(field)];
}

/** Iterates over all multipart fields, yielding files as StreamFiles and text fields as strings. */
export async function* body(options: MultipartOptions = {}): AsyncGenerator<[field: string, value: string | StreamFile]> {
  for await (const data of raw.body(options)) {
    if (isRawFile(data)) {
      yield [data.fieldname, raw2streamFile(data)] as const;
      continue;
    }
    yield [data.fieldname, data.value] as const;
  }
}
