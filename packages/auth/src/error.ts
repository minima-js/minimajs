import { HttpError } from "@minimajs/app/error";

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(message, 401);
  }
}
