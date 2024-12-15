import {
  object,
  type Reference,
  type InferType,
  type ISchema,
  type ObjectShape,
  type ValidateOptions,
  ValidationError,
} from "yup";

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
import { createWriteStream } from "node:fs";
import { StreamMeter } from "./stream.js";
import { pipeline } from "node:stream/promises";
import assert from "node:assert";
import { humanFileSize } from "./helpers.js";

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
        continue;
      }
      if (!schema) {
        continue;
      }
      (data as any)[name] = await validateField(name, body, schema);
    }
    for (const [name, sch] of Object.entries(obj)) {
      if (!(name in data) && isRequired(sch)) {
        throw new UploadError(`The field ${name} is required. Please ensure it is provided.`, {
          code: "FIELD_REQUIRED",
        });
      }
    }
    setMultipartMeta(data);
    return data;
  };
}

async function validateField(name: string, value: unknown, schema: ISchema<any, any, any, any> | Reference<unknown>) {
  try {
    return await (schema as ISchema<any>).validate(value);
  } catch (err) {
    assert(err instanceof ValidationError);
    throw new UploadError(`${err.message.replace("this", name)}`, { base: err });
  }
}

async function uploadTmpFile(file: File, signal: AbortSignal, schema: FileSchema, { tmpDir = tmpdir() }: UploadOption) {
  const rules = schema.getAllRules();
  if (rules.mimetype && file.mimeType !== rules.mimetype) {
    throw new UploadError(`Expect mime type to be ${rules.mimetype} but got ${file.mimeType}`, {
      code: "INVALID_MIMETYPE",
    });
  }
  const meter = new StreamMeter(rules.maxSize ?? Number.MAX_VALUE);
  const filename = join(tmpDir, uuid());
  try {
    await pipeline(file.stream.pipe(meter), createWriteStream(filename));
  } catch (err) {
    if (!(err instanceof RangeError)) {
      throw err;
    }
    throw new UploadError(`The file ${file.field} is too large. Maximum size: ${humanFileSize(meter.maxBytes)} bytes`, {
      code: "FILE_TOO_LARGE",
    });
  }
  if (rules.minSize && meter.bytes < rules.minSize) {
    throw new UploadError(
      `The file ${file.field} is too small. Minimum size: ${humanFileSize(
        rules.minSize
      )} bytes, actual size: ${humanFileSize(meter.bytes)} bytes`,
      { code: "FILE_TOO_SMALL" }
    );
  }
  return new UploadedFile(file, filename, meter.bytes, signal);
}

function validateContentSize(contentSize: number, maxSize: number = 0) {
  if (!maxSize) return;
  if (contentSize > maxSize) {
    throw new UploadError(
      `Request content length exceeds the limit of ${humanFileSize(maxSize)} bytes. Actual size: ${humanFileSize(
        contentSize
      )} bytes.`,
      { code: "MAX_LENGTH_EXCEEDED" }
    );
  }
}

function isRequired(schema: ISchema<any> | Reference): boolean {
  return (schema.describe() as any).tests.some((test: any) => test.name === "required");
}
