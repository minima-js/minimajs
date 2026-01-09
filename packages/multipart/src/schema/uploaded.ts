import { z, ZodArray } from "zod";
import { FileSchema } from "./schema.js";
import { multipart } from "../multipart.js";
import { isFile, type File } from "../file.js";
import { defer, type Context } from "@minimajs/server";
import { v4 as uuid } from "uuid";
import { tmpdir } from "node:os";
import { createWriteStream } from "node:fs";
import { StreamMeter } from "../stream.js";
import { pipeline } from "node:stream/promises";
import { ensurePath } from "../helpers.js";
import * as validate from "./validate.js";
import { isUploadedFile, UploadedFile } from "./uploaded-file.js";
import { pkg } from "../pkg.js";
import { join } from "node:path";

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
  const result: Record<string, unknown> = {} as any;
  defer(() => deleteUploadedFiles(Object.values(result)));
  for await (const [field, data] of multipart.body()) {
    const schema = shape[field];

    if (schema instanceof FileSchema && isFile(data)) {
      result[field] = await validateAndUpload(data, ctx.request.signal, schema, option);
      continue;
    }

    if (schema instanceof ZodArray && schema.element instanceof FileSchema && isFile(data)) {
      result[field] ??= [];
      const files = result[field] as UploadedFile[];
      validate.maximum(schema, files.length, field);
      files.push(await validateAndUpload(data, ctx.request.signal, schema.element, option));
      continue;
    }

    if (isFile(data)) {
      await data.flush();
      continue;
    }

    if (schema instanceof ZodArray) {
      result[field] ??= [];
      (result[field] as string[]).push(data);
      continue;
    }
    result[field] = data;
  }
  return z.object(shape).parse(result);
}

async function deleteUploadedFiles(files: unknown[]) {
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

async function validateAndUpload(file: File, signal: AbortSignal, schema: FileSchema, { tmpDir = tmpdir() }: UploadOption) {
  validate.mimeType(schema, file);
  const maxSize = schema.def.max ?? Infinity;
  const meter = new StreamMeter(maxSize);
  const filename = join(await ensurePath(tmpDir, pkg.name), uuid());
  try {
    await pipeline(file.stream.pipe(meter), createWriteStream(filename));
  } catch (err) {
    if (err instanceof RangeError) {
      await validate.maxSize(schema, file, meter.bytes);
      throw err;
    }
  }
  validate.minSize(schema, file, meter.bytes);
  return new UploadedFile(file, filename, meter.bytes, signal);
}
