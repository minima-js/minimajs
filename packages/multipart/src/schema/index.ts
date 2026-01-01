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
export { createMultipartUpload, type UploadOption } from "./uploaded.js";
export * from "./uploaded-file.js";
export * from "./schema.js";
