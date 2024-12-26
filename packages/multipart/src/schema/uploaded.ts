import {
  object,
  ValidationError,
  ValidationBaseError,
  ArraySchema,
  type InferType,
  type ObjectShape,
  type ValidateOptions,
  type Schema,
} from "@minimajs/schema";

import { extractTests, FileSchema, getTestMaxSize, type ExtractTest } from "./schema.js";
import { getBody } from "../multipart.js";
import { isFile, type File } from "../file.js";
import { createContext, getSignal } from "@minimajs/server/context";
import { defer, getHeader } from "@minimajs/server";
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

export interface UploadOption extends ValidateOptions {
  tmpDir?: string;
  maxSize?: number;
}
export function createMultipartUpload<T extends ObjectShape>(obj: T, option: UploadOption = {}) {
  const tests = extractTests(obj);
  const schema = object(obj);
  type ReturnBody = InferType<typeof schema>;
  const [getMultipartMeta, setMultipartMeta] = createContext<ReturnBody | null>();

  async function cleanup() {
    const body = getMultipartMeta();
    if (!body) {
      return;
    }
    try {
      for (const [, file] of Object.entries(body)) {
        if (Array.isArray(file)) {
          for (const f2 of file) {
            if (!isUploadedFile(f2)) {
              continue;
            }
            await f2.destroy();
          }
        }
        if (!isUploadedFile(file)) {
          continue;
        }
        await file.destroy();
      }
    } catch (err) {
      console.error("unable to delete file temp files!");
    }
  }

  return async function getData(): Promise<ReturnBody> {
    if (option.maxSize) {
      const contentLength = getHeader("content-length", Number, true);
      validateContentSize(contentLength, option.maxSize);
    }
    try {
      defer(cleanup);
      const signal = getSignal();
      const existingBody = getMultipartMeta();
      if (existingBody) {
        return existingBody as ReturnBody;
      }
      const data: ReturnBody = {} as ReturnBody;
      for await (const [name, body] of getBody()) {
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
      setMultipartMeta(data);
      return data;
    } catch (err) {
      if (err instanceof ValidationError) {
        throw err;
      }

      if (err instanceof ValidationBaseError) {
        throw ValidationError.createFromBase(err);
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
