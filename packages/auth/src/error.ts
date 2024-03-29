import { HttpError, type ErrorResponse } from "@minimajs/server/error";

export class UnauthorizedError extends HttpError {
  constructor(response: ErrorResponse) {
    super(response, 401);
  }
}
