/**
 * Multipart upload schema exports.
 *
 * @module @minimajs/multipart/schema
 *
 * @example
 * ```ts
 * import { z } from 'zod';
 * import { createMultipartUpload, file } from "@minimajs/multipart/schema";
 * const upload = createMultipartUpload({
 *   name: z.string().min(3).max(30),
 *   avatar: file().max(2 * 1024 * 1024), // 2MB
 * });
 * const data = await upload();
 * console.log(data.name);
 * await data.avatar.move("/uploads/avatars");
 * ```
 */

import { context } from "@minimajs/server";
import { z } from "zod";
import { getUploadedBody, type UploadOption } from "./uploaded.js";
import { ValidationError } from "./error.js";

export { type UploadOption } from "./uploaded.js";
export * from "./uploaded-file.js";
export * from "./schema.js";

export function createMultipartUpload<T extends z.ZodRawShape>(obj: T, option: UploadOption = {}) {
  const [$body] = context.create(() => getUploadedBody(obj, context(), option));
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
