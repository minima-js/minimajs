import { ValidationError as ValidationBaseError } from "yup";
import { ValidationError as BaseError } from "@minimajs/server/error";
import type { Dict } from "@minimajs/server";

type Params = Dict;
export class ValidationError extends BaseError {
  static create(err: ValidationBaseError) {
    return new ValidationError(err.message, err);
  }

  name = "ValidationError";

  params?: Params;
  value?: any;
  path?: string;
  type?: string;

  errors: string[] = [];
  inner: ValidationError[] = [];

  constructor(public message: string, public base?: ValidationBaseError) {
    super(message);
    if (base) {
      this.params = base.params;
      this.value = base.value;
      this.path = base.path;
      this.type = base.type;
      this.errors = base.errors;
      this.inner = base.inner.map((x) => ValidationError.create(x));
    }
  }
  toJSON(): unknown {
    return ValidationError.toJSON(this);
  }
}

ValidationError.toJSON<ValidationError> = function (err) {
  return { message: err.response, errors: err.errors };
};

export { ValidationBaseError };
