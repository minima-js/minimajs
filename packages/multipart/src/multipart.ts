import { busboy } from "./raw/busboy.js";
import type { MultipartOptions, MultipartRawFile } from "./types.js";
import { isRawFile, raw2file } from "./helpers.js";
import * as raw from "./raw/index.js";

/**
 * Retrieves a single file from a multipart form request.
 *
 * @param name - field name to match. Only files from this field are returned.
 * @returns A promise that resolves to the uploaded File
 * @example
 * ```ts
 * // Get file from specific field
 * const avatar = await multipart.file('avatar');
 * await avatar.move('/uploads');
 * ```
 */
export async function file(name: string, options: MultipartOptions = {}) {
  const field = await raw.file(name, options);
  if (!field) return null;
  return raw2file(field, options.limits ?? {});
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
  const field = await raw.firstFile(options);
  if (!field) return null;
  return [field.fieldname, await raw2file(field, options.limits ?? {})];
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
  for await (const field of raw.body<MultipartRawFile>({ ...options, limits: { ...limits, fields: 0 } })) {
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
 *     console.log(`File: ${name} = ${value.name}`);
 *     helpers.move(value, './dest')
 *   } else {
 *     console.log(`Field: ${name} = ${value}`);
 *   }
 * }
 * ```
 */
export async function* body(options: MultipartOptions = {}): AsyncGenerator<[field: string, value: string | File]> {
  for await (const field of raw.body(options)) {
    if (isRawFile(field)) {
      yield [field.fieldname, await raw2file(field, { fileSize: options.limits?.fileSize ?? Infinity })];
      continue;
    }
    yield [field.fieldname, field.value];
  }
}
