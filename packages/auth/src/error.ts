import { HttpError, type HttpErrorOptions } from "@minimajs/server/error";

export class UnauthorizedError<R> extends HttpError<R> {
  constructor(response: R = "Unauthorized" as R) {
    super(response, 401);
  }
}

export class ForbiddenError<R> extends HttpError<R> {
  constructor(response: R = "Forbidden" as R, options?: HttpErrorOptions) {
    super(response, 403, options);
  }
}
