import { ValidationError } from "./error.js";
import { z } from "zod";
import { extractTests, getTestMaxSize, type ExtractTest } from "./schema.js";
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
export interface UploadOption {
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
export function createMultipartUpload(obj: any, option: UploadOption = {}) {
  const tests = extractTests(obj);
  // Resolve shape: unwrap builder objects into plain zod schemas and collect metadata
  function resolveShape(input: any) {
    const resolved: Record<string, any> = {};
    const raw = input || {};
    for (const [k, v] of Object.entries(raw)) {
      if (v && typeof v === "object" && "schema" in v && typeof (v as any).schema?.parse === "function") {
        // builder object
        resolved[k] = v.schema;
        continue;
      }
      resolved[k] = v;
    }
    return resolved;
  }

  // Build a Zod object schema: if user passed a Zod object use it, otherwise resolve and build
  let zodSchema: any;
  let shape: any;
  if (obj && typeof obj.parse === "function" && obj._def?.typeName === "ZodObject") {
    zodSchema = obj;
    shape = obj._def.shape();
  } else {
    shape = obj;
    const resolved = resolveShape(shape || {});
    zodSchema = z.object(resolved);
  }
  const resolvedShape =
    zodSchema && typeof zodSchema._def?.shape === "function" ? zodSchema._def.shape() : resolveShape(shape || {});
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

  return async function getData(): Promise<any> {
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
        const singleSchema = resolvedShape ? resolvedShape[name] : undefined;
        if (isFile(body)) {
          // array of files when schema is a ZodArray and tests indicate file constraints
          if (
            singleSchema &&
            (singleSchema as any)?._def?.typeName === "ZodArray" &&
            tests[name] &&
            (tests[name].max !== undefined || (tests[name].accept && tests[name].accept.length))
          ) {
            const file = await uploadTmpFile(body, signal, tests[name], option);
            // validate the array field with the uploaded file
            await zodSchema.pick({ [name]: true }).parseAsync({ [name]: [file] });
            append(data, name, file);
            continue;
          }
          // single file if tests indicate file constraints
          if (tests[name] && !(name in data)) {
            set(data, name, await uploadTmpFile(body, signal, tests[name], option));
            await zodSchema.pick({ [name]: true }).parseAsync({ [name]: data[name] });
            continue;
          }
          await body.flush();
          continue;
        }

        if (!singleSchema) {
          continue;
        }
        if ((singleSchema as any)?._def?.typeName === "ZodArray") {
          const parsed = await zodSchema.pick({ [name]: true }).parseAsync({ [name]: [body] });
          append(data, name, ...(parsed[name] as any));
          continue;
        }
        const parsed = await zodSchema.pick({ [name]: true }).parseAsync({ [name]: body });
        set(data, name, parsed[name]);
      }
      // testing for required.
      for (const [name] of Object.entries(shape || {})) {
        if (name in data) continue;
        await zodSchema
          .pick({ [name]: true })
          .parseAsync({ [name]: undefined })
          .catch(() => {
            /* ignore: let zod produce required errors later if needed */
          });
      }
      return data;
    } catch (err) {
      if (err instanceof ValidationError) {
        throw err;
      }

      if (err && (err as any).errors && typeof (err as any).issues !== "undefined") {
        // likely a ZodError
        throw ValidationError.createFromZod(err as any);
      }

      throw err;
    }
  };
}

async function uploadTmpFile(
  file: File,
  signal: AbortSignal,
  tests: ExtractTest = {},
  { tmpDir = tmpdir() }: UploadOption
) {
  await testMimeType(file, tests.accept);
  const meter = new StreamMeter(getTestMaxSize(tests));
  const filename = join(await ensurePath(tmpDir, pkg.name), uuid());
  try {
    await pipeline(file.stream.pipe(meter), createWriteStream(filename));
  } catch (err) {
    if (err instanceof RangeError) {
      await testMaxSize(tests.max, file, meter.bytes);
      throw err;
    }
  }
  return new UploadedFile(file, filename, meter.bytes, signal);
}
