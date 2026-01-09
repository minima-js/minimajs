import { z, ZodError } from "zod";
import { humanFileSize } from "../helpers.js";
import type { File } from "../file.js";

function isValidFileType(file: File, accept: string[]) {
  if (!accept.length) return true;

  const fileExtension = String(file.ext).toLowerCase();
  for (const type of accept) {
    if (type === "*/*") {
      return true;
    }

    // Handle wildcard, e.g. image/*, video/*
    if (type.includes("/")) {
      const [mimeType, mimeSubtype] = type.split("/");
      const [fileType, fileSubtype] = file.mimeType.split("/");

      if (mimeType === "*" || mimeType === fileType) {
        if (mimeSubtype === "*" || mimeSubtype === fileSubtype) {
          return true; // Valid match
        }
      }
    } else {
      // If type is a file extension (e.g. ".pdf")
      if (type.startsWith(".")) {
        if (fileExtension !== type.toLowerCase()) {
          return false;
        }
        return true; // Valid match for extension
      }
      // If no wildcard or extension, check exact MIME type match
      if (file.mimeType === type) {
        return true; // Valid match for MIME type
      }
    }
  }

  // If no valid match found, throw a generic error
  return false;
}

export function mimeType(file: File, accept: string[] | undefined) {
  if (!accept || !accept.length) return;
  if (isValidFileType(file, accept)) return;
  const acceptedTypes = accept.join(", ");

  throw new ZodError([
    {
      code: "invalid_format",
      format: "mime_type",
      pattern: acceptedTypes,
      input: file.mimeType,
      path: [file.field],
      message: `Invalid file type. Expected: ${acceptedTypes}, received: ${file.mimeType}`,
    },
  ]);
}

export async function maxSize(max: number, file: File, size: number) {
  throw new ZodError([
    {
      code: "too_big",
      origin: "file",
      maximum: max,
      input: size,
      path: [file.field],
      message: `File size exceeds maximum. Expected: ${humanFileSize(max)}, received: ${humanFileSize(size)}+`,
    },
  ]);
}

export async function minSize(min: number, file: File, size: number) {
  if (size >= min) return;
  throw new ZodError([
    {
      code: "too_small",
      origin: "file",
      minimum: min,
      input: size,
      path: [file.field],
      message: `File "${file.field}" is too small. Minimum: ${humanFileSize(min)}, actual: ${humanFileSize(size)}`,
    },
  ]);
}

export function required(value: unknown, path: string, message: string) {
  if (value !== undefined) return;
  throw new ZodError([{ code: "invalid_value", path: [path], message, values: [undefined] }]);
}

export function maximum(schema: z.ZodArray, length: number, path: string) {
  const maximum = schema._zod.bag.maximum as number;
  if (length < maximum) {
    return;
  }
  throw new ZodError([
    {
      code: "too_big",
      origin: "array",
      path: [path],
      maximum,
      message: "Maximum supported file exceed",
    },
  ]);
}
