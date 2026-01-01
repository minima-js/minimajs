import { ZodError } from "zod";
import { ValidationError as BaseError, type HttpErrorOptions } from "@minimajs/server/error";
import { ok } from "assert";

export interface ValidatorErrorOptions extends HttpErrorOptions {
  value?: unknown;
  path?: string;
  type?: string;
  errors?: string[];
  inner?: ValidationError[];
}

export interface ValidationError extends ValidatorErrorOptions {}

export class ValidationError extends BaseError {
  static createFromZod(base: ZodError) {
    const error = new ValidationError(base.message, { base });
    // Map Zod issues into a compact errors array and inner errors with path/type
    error.errors = base.issues.map((i) => i.message);
    error.inner = base.issues.map((i) => {
      const ve = new ValidationError(i.message);
      ve.path = Array.isArray(i.path) ? i.path.join(".") : String(i.path ?? "");
      ve.type = (i.code as unknown as string) ?? "validation";
      return ve;
    });
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
  const e = err as ValidationError;
  if (e.errors && e.errors.length) {
    return { message: e.response, errors: e.errors };
  }
  return { message: e.response };
};
