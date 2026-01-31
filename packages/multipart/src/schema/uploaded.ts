import { z, ZodArray, ZodFile } from "zod";
import { defer, type Context } from "@minimajs/server";
import { v4 as uuid } from "uuid";
import { createWriteStream } from "node:fs";
import { StreamMeter } from "../stream.js";
import { stream2void } from "../helpers.js";
import { pipeline } from "node:stream/promises";
import { ensurePath, isRawFile } from "../helpers.js";
import * as validate from "./validate.js";
import * as zodError from "./zod-error.js";
import { join } from "node:path";
import { unlink } from "node:fs/promises";
import { isUploadedFile, TempFile } from "./file.js";
import type { MultipartOptions, MultipartRawFile } from "../types.js";
import * as raw from "../raw/index.js";
import { TMP_DIR } from "./constants.js";

/**
 * Configuration options for multipart upload handling.
 */
export interface UploadOption extends MultipartOptions {
  /** Directory for storing temporary files. Defaults to system temp directory. */
  tmpDir?: string;
}

export async function getUploadedBody<T extends z.ZodRawShape>(
  shape: T,
  ctx: Context,
  option: UploadOption
): Promise<z.infer<z.ZodObject<T>>> {
  const result: Record<string, unknown> = {};

  defer(() => {
    deleteUploadedFiles(Object.values(result)).catch(() => {});
  });

  for await (const field of raw.body(option)) {
    const schema = shape[field.fieldname];

    if (schema instanceof ZodFile && isRawFile(field)) {
      result[field.fieldname] = await validateAndUpload(field, ctx.request.signal, schema, option);
      continue;
    }

    if (schema instanceof ZodArray && schema.element instanceof ZodFile && isRawFile(field)) {
      result[field.fieldname] ??= [];
      const files = result[field.fieldname] as TempFile[];
      validate.maxLength(schema, files.length, field.fieldname);
      files.push(await validateAndUpload(field, ctx.request.signal, schema.element, option));
      continue;
    }

    // Drain unexpected file fields or fields not in schema
    if (isRawFile(field)) {
      await pipeline(field.stream, stream2void());
      continue;
    }

    // Skip fields not in schema
    if (!schema) continue;

    if (schema instanceof ZodArray) {
      result[field.fieldname] ??= [];
      (result[field.fieldname] as string[]).push(field.value);
      continue;
    }

    result[field.fieldname] = field.value;
  }
  return z.object(shape).parse(result);
}

function deleteUploadedFiles(files: unknown[]): Promise<unknown[]> {
  const promises = files.flatMap((file) => {
    if (Array.isArray(file)) {
      return deleteUploadedFiles(file);
    }
    if (isUploadedFile(file)) {
      return file.destroy();
    }
    return [];
  });

  return Promise.all(promises);
}

async function validateAndUpload(
  rawFile: MultipartRawFile,
  signal: AbortSignal,
  schema: ZodFile,
  { tmpDir = TMP_DIR }: UploadOption
) {
  const maxSize = schema._zod.bag.maximum ?? Infinity;
  const meter = new StreamMeter(maxSize);
  const filename = join(await ensurePath(tmpDir), uuid());
  try {
    await pipeline(rawFile.stream.pipe(meter), createWriteStream(filename), { signal });
  } catch (err) {
    await unlink(filename).catch(() => {});
    if (err instanceof RangeError) {
      throw zodError.maxFileSizeError(schema, rawFile, meter.bytes);
    }
    throw err;
  }
  return new TempFile(rawFile.filename, {
    path: filename,
    size: meter.bytes,
    signal,
    type: rawFile.mimeType,
  });
}
