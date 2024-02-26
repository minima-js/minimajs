import { HttpError } from "@minimajs/server/error";

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(message, 401);
  }
}
