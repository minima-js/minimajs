import { HttpError, type ErrorResponse, type HttpErrorOptions } from "@minimajs/server/error";

export class UploadError extends HttpError {
  constructor(response: ErrorResponse, option?: HttpErrorOptions) {
    super(response, 422, option);
  }
}
