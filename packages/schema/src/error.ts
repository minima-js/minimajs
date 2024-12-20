import { ValidationError as ValidationBaseError } from "yup";
import { ValidationError as BaseError, type HttpErrorOptions } from "@minimajs/server/error";
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

export interface ValidatorErrorOptions extends HttpErrorOptions {
  params?: Params;
  value?: unknown;
  path?: string;
  type?: string;
  errors?: string[];
  inner?: ValidationError[];
}

export interface ValidationError extends ValidatorErrorOptions {}

export class ValidationError extends BaseError {
  static createFromBase(base: ValidationBaseError) {
    const error = new ValidationError(base.message, { base });
    error.params = base.params as unknown as Params;
    error.value = base.value;
    error.path = base.path;
    error.type = base.type;
    error.errors = base.errors;
    error.inner = base.inner.map((x) => ValidationError.createFromBase(x));
    return error;
  }

  inner: ValidationError[] = [];
  name = ValidationError.name;

  constructor(public message: string, extend: ValidatorErrorOptions = {}) {
    super(message);
    Object.assign(this, extend);
    const { base } = extend;
    if (base && base instanceof Error) {
      this.cause = base.message;
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
