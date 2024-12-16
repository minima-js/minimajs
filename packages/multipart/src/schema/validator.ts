import { type ISchema, type Reference, ValidationError, ValidationBaseError } from "@minimajs/schema";
import { assertError, humanFileSize } from "../helpers.js";
import type { File } from "../file.js";

export async function validateField(
  name: string,
  value: unknown,
  schema: ISchema<any, any, any, any> | Reference<unknown>
) {
  try {
    return await (schema as ISchema<any>).validate(value);
  } catch (err) {
    assertError(err, ValidationBaseError);
    throw new ValidationError(`${err.message.replace("this", name)}`, { base: err, path: name, value, type: "string" });
  }
}

export function validateContentSize(contentSize: number, maxSize: number = 0) {
  if (!maxSize) return;
  if (contentSize > maxSize) {
    throw new ValidationError(
      `Request content length exceeds the limit of ${humanFileSize(maxSize)} bytes. Actual size: ${humanFileSize(
        contentSize
      )} bytes.`,
      { code: "MAX_LENGTH_EXCEEDED" }
    );
  }
}

export function isRequired(schema: ISchema<any> | Reference): boolean {
  return (schema.describe() as any).tests.some((test: any) => test.name === "required");
}

export function validateFileType(file: File, accept: string[]): void {
  if (!accept.length) return;

  const fileExtension = file.ext;
  for (const type of accept) {
    if (type === "*/*") {
      return; // Allow all types
    }

    // Handle wildcard, e.g. image/*, video/*
    if (type.includes("/")) {
      const [mimeType, mimeSubtype] = type.split("/");
      const [fileType, fileSubtype] = file.mimeType.split("/");

      if (mimeType === "*" || mimeType === fileType) {
        if (mimeSubtype === "*" || mimeSubtype === fileSubtype) {
          return; // Valid match
        }
      }
    } else {
      // If type is a file extension (e.g. ".pdf")
      if (type.startsWith(".")) {
        if (fileExtension !== type.toLowerCase()) {
          throw new ValidationError(`Invalid file extension: ${file.filename}. Expected file extension: ${type}`, {
            path: file.field,
          });
        }
        return; // Valid match for extension
      }

      // If no wildcard or extension, check exact MIME type match
      if (file.mimeType === type) {
        return; // Valid match for MIME type
      }
    }
  }

  // If no valid match found, throw a generic error
  throw new ValidationError(`Invalid file type: ${file.filename}. Allowed types are: ${accept.join(", ")}.`, {
    path: file.field,
  });
}
