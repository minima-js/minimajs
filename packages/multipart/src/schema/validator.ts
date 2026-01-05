import { ZodError } from "zod";
import { ValidationError } from "./error.js";
import { humanFileSize } from "../helpers.js";
import type { File } from "../file.js";

export async function validateField(_name: string, value: unknown, schema: any) {
  try {
    // Use Zod parseAsync to validate value for the provided schema
    if (typeof schema?.parseAsync === "function") {
      return await schema.parseAsync(value);
    }
    // fallback: assume it's a plain validator function
    return await (schema as any)(value);
  } catch (err) {
    if (err instanceof ZodError) {
      throw ValidationError.createFromZod(err);
    }
    throw err;
  }
}

export function validateContentSize(contentSize: number, maxSize: number) {
  if (contentSize > maxSize) {
    throw new ValidationError(
      `Request content length exceeds the limit of ${humanFileSize(maxSize)} bytes. Actual size: ${humanFileSize(
        contentSize
      )} bytes.`,
      { code: "MAX_LENGTH_EXCEEDED" }
    );
  }
}

export function validateFileType(file: File, accept: string[]) {
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

export function testMimeType(file: File, accept: string[] | undefined) {
  if (!accept || !accept.length) return;
  if (!validateFileType(file, accept)) {
    const acceptedTypes = accept.join(", ");
    throw new ValidationError(`Invalid file type for "${file.field}". Expected: ${acceptedTypes}`, {
      issues: [
        {
          code: "invalid_format",
          format: "mime_type",
          pattern: acceptedTypes,
          input: file.mimeType,
          path: [file.field],
          message: `Invalid file type. Expected: ${acceptedTypes}, received: ${file.mimeType}`,
        },
      ],
    });
  }
}

export async function testMaxSize(max: number | undefined, file: File, size: number) {
  if (!max) return;
  if (size > max) {
    throw new ValidationError(
      `File "${file.field}" is too large. Maximum: ${humanFileSize(max)}, actual: ${humanFileSize(size)}`,
      {
        issues: [
          {
            code: "too_big",
            origin: "file",
            maximum: max,
            input: size,
            path: [file.field],
            message: `File size exceeds maximum. Expected: ${humanFileSize(max)}, received: ${humanFileSize(size)}`,
          },
        ],
      }
    );
  }
}
