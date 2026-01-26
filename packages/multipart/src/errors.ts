import { HttpError } from "@minimajs/server/error";

/**
 * HTTP error for file upload failures.
 * Returns a 400 Unprocessable Entity status code.
 *
 * @example
 * ```ts
 * throw new UploadError('File upload failed');
 * throw new UploadError({ message: 'Invalid file type' });
 * ```
 */
export class UploadError<R = unknown> extends HttpError<R> {
  name = UploadError.name;
}
