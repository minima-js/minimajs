/**
 * Type-safe multipart form data parsing with Zod schema validation.
 *
 * This module provides schema-based validation for multipart uploads using Zod.
 * Files are automatically saved to disk as TempFile instances (memory-efficient),
 * while text fields are validated according to your schema.
 *
 * @module @minimajs/multipart/schema
 *
 * @remarks
 * Key features:
 * - Full TypeScript type inference from Zod schemas
 * - Automatic file size validation with `.max()` and `.min()`
 * - Disk-backed file storage (TempFile) to avoid memory issues
 * - Native File API compatibility
 * - Supports single and multiple file uploads
 * - Built-in MIME type validation with `.mime()`
 *
 * @example Basic usage with file upload
 * ```ts
 * import { z } from 'zod';
 * import { createMultipart } from "@minimajs/multipart/schema";
 * import { helpers } from "@minimajs/multipart";
 *
 * const upload = createMultipart({
 *   name: z.string().min(3).max(30),
 *   avatar: z.file().max(2 * 1024 * 1024), // 2MB max
 * });
 *
 * const data = await upload();
 * console.log(data.name); // Type-safe access
 * await helpers.move(data.avatar, "./uploads/avatars");
 * ```
 *
 * @example Multiple files with validation
 * ```ts
 * import { createMultipart } from "@minimajs/multipart/schema";
 *
 * const upload = createMultipart({
 *   email: z.string().email(),
 *   photos: z.array(z.file().max(5 * 1024 * 1024)).max(10), // Max 10 photos, 5MB each
 * });
 *
 * const data = await upload();
 * for (const photo of data.photos) {
 *   await helpers.move(photo, "./uploads/photos");
 * }
 * ```
 *
 * @example MIME type validation
 * ```ts
 * const upload = createMultipart({
 *   avatar: z.file()
 *     .max(2 * 1024 * 1024)
 *     .mime(['image/jpeg', 'image/png']),
 * });
 * ```
 */

import { context, createContext } from "@minimajs/server";
import { z } from "zod";
import { getUploadedBody, type UploadOption } from "./uploaded.js";
import { ValidationError } from "./error.js";

export { type UploadOption } from "./uploaded.js";

/**
 * Creates a type-safe multipart form data parser with Zod schema validation.
 * Returns a function that parses and validates incoming multipart requests,
 * providing TempFile instances for uploaded files (disk-backed, memory-efficient).
 *
 * @template T - Zod schema shape defining expected fields and files
 * @param obj - Zod schema object defining the structure of multipart data
 * @param option - Optional upload configuration (limits, temp directory, etc.)
 * @returns Async function that parses and validates multipart data
 * @throws {ValidationError} When validation fails (wrapped ZodError)
 *
 * @example Basic usage with file upload
 * ```ts
 * import { z } from 'zod';
 * import { createMultipart } from "@minimajs/multipart/schema";
 * import { helpers } from "@minimajs/multipart";
 *
 * const upload = createMultipart({
 *   name: z.string().min(3).max(30),
 *   avatar: z.file().max(2 * 1024 * 1024), // 2MB max
 * });
 *
 * const data = await upload();
 * console.log(data.name); // Type-safe access
 * await helpers.move(data.avatar, "./uploads/avatars");
 * ```
 */
export function createMultipart<T extends z.ZodRawShape>(obj: T, option: UploadOption = {}) {
  const [$body] = createContext(() => getUploadedBody(obj, context(), option));
  return async function getData(): Promise<z.infer<z.ZodObject<T>>> {
    try {
      return await $body();
    } catch (err) {
      if (err instanceof z.ZodError) {
        throw ValidationError.createFromZod(err);
      }
      throw err;
    }
  };
}
