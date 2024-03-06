import { HttpError } from "@minimajs/server/error";
import { ValidationError as BaseError } from "yup";

export class ValidationError extends HttpError {
  static is(value: unknown): value is ValidationError {
    return value instanceof this;
  }
  constructor(public readonly base: BaseError) {
    super(base.message, 422);
  }
}
