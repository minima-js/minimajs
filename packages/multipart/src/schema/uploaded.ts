import { z, ZodArray } from "zod";
import { FileSchema } from "./schema.js";
import { multipart } from "../multipart.js";
import { defer, type Context } from "@minimajs/server";
import { v4 as uuid } from "uuid";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { stream2void, StreamMeter } from "../stream.js";
import { pipeline } from "node:stream/promises";
import { ensurePath, isRawFile } from "../helpers.js";
import * as validate from "./validate.js";
import { pkg } from "../pkg.js";
import { join } from "node:path";
import { isUploadedFile, UploadedFile } from "./uploaded-file.js";
import type { MultipartRawFile } from "../types.js";

/**
 * Configuration options for multipart upload handling.
 */
export interface UploadOption {
  /** Directory for storing temporary files. Defaults to system temp directory. */
  tmpDir?: string;
  /** Maximum total request size in bytes. Validated before processing. */
  maxSize?: number;
}

export async function getUploadedBody<T extends z.ZodRawShape>(
  shape: T,
  ctx: Context,
  option: UploadOption
): Promise<z.infer<z.ZodObject<T>>> {
  const result: Record<string, unknown> = {};

  defer(() => deleteUploadedFiles(Object.values(result)));

  for await (const field of multipart.raw({})) {
    const schema = shape[field.fieldname];

    if (schema instanceof FileSchema && isRawFile(field)) {
      result[field.fieldname] = await validateAndUpload(field, ctx.request.signal, schema, option);
      continue;
    }

    if (schema instanceof ZodArray && schema.element instanceof FileSchema && isRawFile(field)) {
      result[field.fieldname] ??= [];
      const files = result[field.fieldname] as UploadedFile[];
      validate.maximum(schema, files.length, field.fieldname);
      files.push(await validateAndUpload(field, ctx.request.signal, schema.element, option));
      continue;
    }

    if (isRawFile(field)) {
      await pipeline(field.stream, stream2void());
      continue;
    }

    if (schema instanceof ZodArray) {
      result[field.fieldname] ??= [];
      (result[field.fieldname] as string[]).push(field.value);
      continue;
    }

    result[field.fieldname] = field.value;
  }
  return z.object(shape).parse(result);
}

async function deleteUploadedFiles(files: unknown[]) {
  await Promise.allSettled(
    files.map(async (file) => {
      if (Array.isArray(file)) {
        return deleteUploadedFiles(file);
      }
      if (!isUploadedFile(file)) {
        return;
      }
      await file.destroy();
    })
  );
}

async function validateAndUpload(
  rawFile: MultipartRawFile,
  signal: AbortSignal,
  schema: FileSchema,
  { tmpDir = tmpdir() }: UploadOption
) {
  validate.mimeType(schema, rawFile);
  const maxSize = schema.def.max ?? Infinity;
  const meter = new StreamMeter(maxSize);
  const filename = join(await ensurePath(tmpDir, pkg.name), uuid());
  try {
    await pipeline(rawFile.stream.pipe(meter), createWriteStream(filename));
  } catch (err) {
    if (err instanceof RangeError) {
      validate.maxSize(schema, rawFile, meter.bytes);
    }
    throw err;
  }
  validate.minSize(schema, rawFile, meter.bytes);
  return new UploadedFile(rawFile.filename, { path: filename, size: meter.bytes, signal });
}
