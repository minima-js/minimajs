import { HttpError } from "@minimajs/server/error";
import { ValidationError as BaseValidation } from "yup";

export class ValidationError extends HttpError {
  validation?: BaseValidation;
  constructor(public readonly raw: unknown) {
    super(raw instanceof Error ? raw.message : "Unknown validation error", 422);
    if (raw instanceof BaseValidation) {
      this.validation = raw;
    }
  }
}
