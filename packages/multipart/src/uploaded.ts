import { object, Reference, type InferType, type ISchema, type ObjectShape, type ValidateOptions } from "yup";

import { FileSchema } from "./schema.js";
import { getBody } from "./multipart.js";
import { isFile, type File } from "./file.js";
import { UploadedFile } from "./unstable.js";
import { createContext, getSignal } from "@minimajs/server/context";
import { defer, getHeader } from "@minimajs/server";
import { UploadError } from "./errors.js";
import { v4 as uuid } from "uuid";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { StreamMeter } from "./stream.js";

function isUploadedFile(file: unknown) {
  return file instanceof UploadedFile;
}

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
    defer(cleanup);
    const signal = getSignal();
    validateContentSize(getHeader("content-length", Number, true), option.maxSize);
    const existingBody = getMultipartMeta();
    if (existingBody) {
      return existingBody as ReturnBody;
    }
    const data: ReturnBody = {} as any;
    for await (const [name, body] of getBody()) {
      const schema = obj[name];
      if (isFile(body)) {
        if (!schema || !(schema instanceof FileSchema)) {
          await body.flush();
          continue;
        }
        (data as any)[name] = await uploadTmpFile(body, signal, schema, option);
      }
      if (!schema) {
        continue;
      }
      await validateField(name, body, schema);
      (data as any)[name] = body;
    }

    for (const [name, sch] of Object.entries(obj)) {
      if (!(name in data) && isRequired(sch)) {
        throw new UploadError(`${name} is required`);
      }
    }
    setMultipartMeta(data);
    return data;
  };
}

async function validateField(_name: string, value: unknown, schema: ISchema<any, any, any, any> | Reference<unknown>) {
  (schema as ISchema<any>).validate(value);
}

async function uploadTmpFile(file: File, signal: AbortSignal, schema: FileSchema, { tmpDir = tmpdir() }: UploadOption) {
  const mimeType = schema.getMimeType();
  if (mimeType && file.mimeType !== mimeType) {
    throw new UploadError(`Expect mime type to be ${mimeType} but got ${file.mimeType}`);
  }
  const meter = new StreamMeter(schema.getSize() ?? Number.MAX_VALUE);
  const filename = join(tmpDir, uuid());
  await pipeline(file.stream.pipe(meter), createWriteStream(filename));
  return new UploadedFile(file, filename, meter.bytes, signal);
}

function validateContentSize(contentSize: number, maxSize: number = 0) {
  if (maxSize) return;
  if (contentSize > maxSize) {
    throw RangeError(`Content Length not allowed more than ${maxSize}`, { cause: "MAX_SIZE_EXCEEDED" });
  }
}

function isRequired(_schema: ISchema<any> | Reference): boolean {
  return false;
}
