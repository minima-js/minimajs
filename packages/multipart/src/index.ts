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
import { multipart } from "./multipart.js";

/**
 * Retrieves a single file from multipart form data.
 *
 * @example
 * ```ts
 * const avatar = getFile('avatar');
 * ```
 * @see {@link multipart.file}
 * @deprecated Use {@link multipart.file} instead
 */
export const getFile = multipart.file;

/**
 * Retrieves multiple files from multipart form data.
 *
 * @example
 * ```ts
 * const images = getFiles('images');
 * ```
 * @see {@link multipart.files}
 * @deprecated Use {@link multipart.files} instead
 */
export const getFiles = multipart.files;

/**
 * Retrieves fields from multipart form data.
 *
 * @example
 * ```ts
 * const fields = getFields();
 * ```
 * @see {@link multipart.fields}
 * @deprecated Use {@link multipart.fields} instead
 */
export const getFields = multipart.fields;

/**
 * Retrieves the parsed body from multipart form data.
 *
 * @example
 * ```ts
 * const body = getBody();
 * ```
 * @see {@link multipart.body}
 * @deprecated Use {@link multipart.body} instead
 */
export const getBody = multipart.body;
