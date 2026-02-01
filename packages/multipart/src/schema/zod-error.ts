import { z, ZodFile, ZodError } from "zod";
import { humanFileSize } from "../helpers.js";
import type { MultipartRawFile } from "../types.js";

export function maxFileSizeError(schema: ZodFile, file: MultipartRawFile, size: number): ZodError {
  const max = schema._zod.bag.maximum!;
  return new ZodError([
    {
      code: "too_big",
      origin: "file",
      maximum: max,
      input: size,
      path: [file.fieldname],
      message: `File size exceeds maximum. Expected: ${humanFileSize(max)}, received: ${humanFileSize(size)}+`,
    },
  ]);
}

export function maxLengthError(schema: z.ZodArray, length: number, path: string): ZodError {
  const maximum = schema._zod.bag.maximum as number;
  return new ZodError([
    {
      code: "too_big",
      origin: "array",
      path: [path],
      input: length,
      maximum,
      message: "Maximum supported file exceed",
    },
  ]);
}
