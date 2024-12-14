import { ValidationError as ValidationBaseError } from "yup";
import { ValidationError as BaseError } from "@minimajs/server/error";
import { ok } from "assert";

interface Params {
  value: unknown;
  originalValue: unknown;
  label: string;
  path: string;
  spec: Spec;
  disableStackTrace: boolean;
}

interface Spec {
  strip: boolean;
  strict: boolean;
  abortEarly: boolean;
  recursive: boolean;
  disableStackTrace: boolean;
  nullable: boolean;
  optional: boolean;
  coerce: boolean;
}

export class ValidationError extends BaseError {
  static create(err: ValidationBaseError) {
    return new ValidationError(err.message, err);
  }

  params?: Params;
  value?: unknown;
  path?: string;
  type?: string;

  errors: string[] = [];
  inner: ValidationError[] = [];

  constructor(public message: string, public base?: ValidationBaseError) {
    super(message);
    if (base) {
      this.params = base.params as unknown as Params;
      this.value = base.value;
      this.path = base.path;
      this.type = base.type;
      this.errors = base.errors;
      this.inner = base.inner.map((x) => ValidationError.create(x));
    }
  }
}

ValidationError.toJSON = function toJSON(err: unknown) {
  ok(err instanceof ValidationError);
  if (err.params?.spec.abortEarly) {
    return { message: err.response };
  }
  return { message: err.response, errors: err.errors };
};

export { ValidationBaseError };
