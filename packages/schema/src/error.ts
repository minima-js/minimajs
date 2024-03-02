import { HttpError } from "@minimajs/server/error";
import { ValidationError as BaseValidation } from "yup";

export class ValidationError extends HttpError {
  static is(value: unknown): value is ValidationError {
    return value instanceof this;
  }
  constructor(public readonly validation: BaseValidation) {
    super(validation.message, 422);
  }
}
