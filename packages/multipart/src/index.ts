/**
 * @packageDocumentation
 * Collection of multipart form data handling utilities including file uploads and schema validation.
 *
 * @module @minimajs/multipart
 *
 * @example
 * ```ts
 * import { multipart, helpers } from "@minimajs/multipart";
 *
 * const file = await multipart.file('avatar');
 * console.log(file.name);
 * await helpers.save(file, '/uploads/avatars');
 * ```
 */

export * as multipart from "./multipart/index.js";
export * as raw from "./raw/index.js";
export * as streaming from "./streaming/index.js";
export * as helpers from "./helpers.js";
export * from "./types.js";
