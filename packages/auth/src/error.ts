import { HttpError, type ErrorResponse, type HttpErrorOptions } from "@minimajs/server/error";

export class UnauthorizedError extends HttpError {
  constructor(response: ErrorResponse = "Unauthorized") {
    super(response, 401);
  }
}

export class ForbiddenError extends HttpError {
  constructor(response: ErrorResponse = "Forbidden", options?: HttpErrorOptions) {
    super(response, 403, options);
  }
}
