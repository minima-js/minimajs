import { ValidationError } from "./error.js";

import {
  object,
  type InferType,
  type ObjectShape,
  ArraySchema,
  type ValidateOptions,
  ValidationError as ValidationBaseError,
  type Schema,
} from "yup";

import { extractTests, FileSchema, getTestMaxSize, type ExtractTest } from "./schema.js";
import { multipart } from "../multipart.js";
import { isFile, type File } from "../file.js";
import { createContext } from "@minimajs/server";
import { defer, headers, request } from "@minimajs/server";
import { v4 as uuid } from "uuid";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { StreamMeter } from "../stream.js";
import { pipeline } from "node:stream/promises";
import { append, ensurePath, set } from "../helpers.js";
import { testMaxSize, testMimeType, validateContentSize } from "./validator.js";
import { isUploadedFile, UploadedFile } from "./uploaded-file.js";
import { pkg } from "../pkg.js";
import { join } from "node:path";
import assert from "node:assert";

type GenericValue = string | string[] | UploadedFile | UploadedFile[];

async function deleteUploadedFiles(files: GenericValue[]) {
  for (const file of files) {
    if (Array.isArray(file)) {
      await deleteUploadedFiles(file);
    }
    if (!isUploadedFile(file)) {
      continue;
    }
    await file.destroy();
  }
}

/**
 * Configuration options for multipart upload handling.
 */
export interface UploadOption extends ValidateOptions {
  /** Directory for storing temporary files. Defaults to system temp directory. */
  tmpDir?: string;
  /** Maximum total request size in bytes. Validated before processing. */
  maxSize?: number;
}

/**
 * Creates a multipart upload handler with Yup schema validation.
 * Files are validated against the schema and saved to temporary storage.
 * Temporary files are automatically cleaned up when the request completes.
 *
 * @example
 * ```ts
 * import { createMultipartUpload, file } from '@minimajs/multipart/schema';
 * import { string, array } from 'yup';
 *
 * const upload = createMultipartUpload({
 *   name: string().required(),
 *   email: string().email().required(),
 *   avatar: file()
 *     .required()
 *     .max(5 * 1024 * 1024)
 *     .accept(['image/png', 'image/jpeg']),
 *   documents: array(
 *     file()
 *       .max(10 * 1024 * 1024)
 *       .accept(['application/pdf'])
 *   )
 * }, {
 *   tmpDir: '/uploads/temp',
 *   maxSize: 50 * 1024 * 1024 // 50MB total
 * });
 *
 * const data = await upload();
 * console.log(data.name);
 * await data.avatar.move('/uploads/avatars');
 * ```
 */
export function createMultipartUpload<T extends ObjectShape>(obj: T, option: UploadOption = {}) {
  const tests = extractTests(obj);
  const schema = object(obj);
  const [getMultipartMeta, setMultipartMeta] = createContext<Record<string, GenericValue>>();
  async function cleanup() {
    const body = getMultipartMeta();
    if (!body) {
      return;
    }
    try {
      await deleteUploadedFiles(Object.values(body));
    } catch (err) {
      assert(err instanceof Error);
      console.error(err.message);
    }
  }

  return async function getData(): Promise<InferType<typeof schema>> {
    if (option.maxSize) {
      const contentLength = headers.get("content-length", Number) ?? 0;
      validateContentSize(contentLength, option.maxSize);
    }
    defer(cleanup);
    try {
      const signal = request.signal();
      const existingBody = getMultipartMeta();
      if (existingBody) {
        return existingBody as any;
      }
      const data: any = {};
      setMultipartMeta(data);
      for await (const [name, body] of multipart.body()) {
        const singleSchema = obj[name] as Schema;
        if (isFile(body)) {
          if (singleSchema instanceof ArraySchema && singleSchema.innerType instanceof FileSchema) {
            const file = await uploadTmpFile(body, signal, singleSchema.innerType, tests[name], option);
            await schema.validateAt(name, { [name]: [file] });
            append(data, name, file);
            continue;
          }
          if (singleSchema instanceof FileSchema && !(name in data)) {
            set(data, name, await uploadTmpFile(body, signal, singleSchema, tests[name], option));
            await schema.validateAt(name, data);
            continue;
          }
          await body.flush();
          continue;
        }

        if (!singleSchema) {
          continue;
        }
        if (singleSchema instanceof ArraySchema) {
          append(data, name, ...(await schema.validateAt(name, { [name]: [body] })));
          continue;
        }
        set(data, name, await schema.validateAt(name, { [name]: body }));
      }
      // testing for required.
      for (const [name] of Object.entries(obj)) {
        if (name in data) {
          continue;
        }
        await schema.validateAt(name, {});
      }
      return data;
    } catch (err) {
      if (err instanceof ValidationError) {
        throw err;
      }

      if (err instanceof ValidationBaseError) {
        throw ValidationError.createFromYup(err);
      }

      throw err;
    }
  };
}

async function uploadTmpFile(
  file: File,
  signal: AbortSignal,
  schema: FileSchema,
  tests: ExtractTest = {},
  { tmpDir = tmpdir() }: UploadOption
) {
  await testMimeType(file, tests.accept, schema);
  const meter = new StreamMeter(getTestMaxSize(tests.max!));
  const filename = join(await ensurePath(tmpDir, pkg.name), uuid());
  try {
    await pipeline(file.stream.pipe(meter), createWriteStream(filename));
  } catch (err) {
    if (err instanceof RangeError) {
      await testMaxSize(tests.max, file, meter.bytes, schema);
      throw err;
    }
  }
  return new UploadedFile(file, filename, meter.bytes, signal);
}
