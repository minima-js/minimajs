import { HttpError, type ErrorResponse, type HttpErrorOptions } from "@minimajs/server/error";

export class UploadError extends HttpError {
  constructor(response: ErrorResponse, option?: HttpErrorOptions) {
    super(response, 422, option);
  }
}

export function assertError<T>(err: unknown, Type: new (...args: any[]) => T): asserts err is T {
  if (err instanceof Type) {
    return;
  }
  throw err;
}
