import { HttpError, type HttpErrorOptions } from "@minimajs/server/error";

/**
 * HTTP error for file upload failures.
 * Returns a 422 Unprocessable Entity status code.
 *
 * @example
 * ```ts
 * throw new UploadError('File upload failed');
 * throw new UploadError({ message: 'Invalid file type' });
 * ```
 */
export class UploadError<R = unknown> extends HttpError<R> {
  constructor(response: R, option?: HttpErrorOptions) {
    super(response, 422, option);
    this.name = UploadError.name;
  }
}

/**
 * Type assertion helper that throws if the error is not of the expected type.
 *
 * @example
 * ```ts
 * try {
 *   await uploadFile();
 * } catch (err) {
 *   assertError(err, UploadError);
 *   // err is now typed as UploadError
 * }
 * ```
 */
export function assertError<T>(err: unknown, Type: new (...args: any[]) => T): asserts err is T {
  if (err instanceof Type) {
    return;
  }
  throw err;
}
