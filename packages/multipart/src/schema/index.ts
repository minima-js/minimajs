/**
 * Multipart upload schema exports.
 *
 * @module @minimajs/multipart/schema
 *
 * @example
 * ```ts
 * import { createMultipartUpload, file } from "@minimajs/multipart/schema";
 * import { string, array } from "yup";
 * const upload = createMultipartUpload({
 *   name: string().min(3).max(30),
 *   avatar: file().maxSize(2 * 1024 * 1024), // 2MB
 * });
 * const data = await upload();
 * console.log(data.name);
 * await data.avatar.move("/uploads/avatars");
 * ```
 */
export { createMultipartUpload, type UploadOption } from "./uploaded.js";
export * from "./uploaded-file.js";
export * from "./schema.js";
