import {
  object,
  type InferType,
  type ObjectShape,
  type ValidateOptions,
  ValidationError,
  ValidationBaseError,
  type Schema,
} from "@minimajs/schema";

import { FileSchema, getAcceptanceTest, getMaxSize } from "./schema.js";
import { getBody } from "../multipart.js";
import { isFile, type File } from "../file.js";
import { createContext, getSignal } from "@minimajs/server/context";
import { defer, getHeader } from "@minimajs/server";
import { v4 as uuid } from "uuid";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { StreamMeter } from "../stream.js";
import { pipeline } from "node:stream/promises";
import { ensurePath, humanFileSize, set } from "../helpers.js";
import { validateContentSize } from "./validator.js";
import { isUploadedFile, UploadedFile } from "./uploaded-file.js";
import { pkg } from "../pkg.js";
import { join } from "node:path";

interface UploadOption extends ValidateOptions {
  tmpDir?: string;
  maxSize?: number;
}

export function createMultipartUpload<T extends ObjectShape>(obj: T, option: UploadOption = {}) {
  const schema = object(obj);
  type ReturnBody = InferType<typeof schema>;
  const [getMultipartMeta, setMultipartMeta] = createContext<ReturnBody | null>();

  async function cleanup() {
    const body = getMultipartMeta();
    if (!body) {
      return;
    }
    for (const [, file] of Object.entries(body)) {
      if (!isUploadedFile(file)) {
        continue;
      }
      await file.destroy();
    }
  }

  return async function getData(): Promise<ReturnBody> {
    try {
      defer(cleanup);
      const signal = getSignal();
      validateContentSize(getHeader("content-length", Number, true), option.maxSize);
      const existingBody = getMultipartMeta();
      if (existingBody) {
        return existingBody as ReturnBody;
      }
      const data: ReturnBody = {} as any;
      for await (const [name, body] of getBody()) {
        const singleSchema = obj[name] as Schema;
        if (isFile(body)) {
          if (!singleSchema || !(singleSchema instanceof FileSchema)) {
            await body.flush();
            continue;
          }
          set(data, name, await uploadTmpFile(body, signal, singleSchema, option));
          await schema.validateAt(name, data);
          continue;
        }
        if (!singleSchema) {
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

async function uploadTmpFile(file: File, signal: AbortSignal, schema: FileSchema, { tmpDir = tmpdir() }: UploadOption) {
  await testMimeType(file, schema);
  const maxSize = getMaxSize(schema);
  const meter = new StreamMeter(maxSize);
  const filename = join(await ensurePath(tmpDir, pkg.name), uuid());
  try {
    await pipeline(file.stream.pipe(meter), createWriteStream(filename));
  } catch (err) {
    if (err instanceof RangeError) {
      throw new ValidationError(`${file.field} is exceeding max allowed size ${humanFileSize(maxSize)}`);
    }
    throw err;
  }
  return new UploadedFile(file, filename, meter.bytes, signal);
}

function testMimeType(file: File, schema: FileSchema) {
  const acceptanceTest = getAcceptanceTest(schema);
  if (!acceptanceTest) return;
  return new Promise((resolve, reject) => {
    acceptanceTest(
      {
        path: file.field,
        value: file,
        originalValue: file,
        options: {},
        schema,
      },
      reject,
      resolve
    );
  });
}
