/**
 * @packageDocumentation
 * Collection of multipart form data handling utilities including file uploads and schema validation.
 *
 * @module @minimajs/multipart
 *
 * @example
 * ```ts
 * import { multipart } from "@minimajs/multipart";
 *
 * const file = await multipart.file('avatar');
 * console.log(file.filename);
 * await file.move('/uploads/avatars');
 * ```
 */
export * from "./file.js";
export * from "./multipart.js";
