import { type z, ZodError } from "zod";
import { HttpError as BaseError, type HttpErrorOptions } from "@minimajs/server/error";

export class SchemaError extends Error {}

/**
 * Options for creating a validation error.
 * Extends HTTP error options with validation-specific properties.
 */
export interface ValidatorErrorOptions extends Omit<HttpErrorOptions, "base"> {
  /** Array of zod issues */
  issues?: z.core.$ZodIssue[];
  /** The base error */
  base?: unknown;
}

function formatValidationMessage({ issues }: ZodError): string {
  const fields = issues
    .map((issue) => issue.path.join("."))
    .filter(Boolean)
    .slice(0, 3);

  if (!fields.length) return "Validation failed";

  const fieldList = `'${fields.join("', '")}'`;
  const moreCount = issues.length > 3 ? ` and ${issues.length - 3} more` : "";
  return `Validation failed for ${fieldList}${moreCount}`;
}

/**
 * Custom validation error class for schema validation failures.
 * Extends the base HTTP error with validation-specific properties and methods.
 * Provides integration with Zod validation errors and enhanced error reporting.
 */
export class ValidationError extends BaseError {
  /** Array of zod issues */
  issues?: z.core.$ZodIssue[];
  /**
   * Creates a ValidationError from a ZodError.
   * Recursively converts nested validation errors.
   *
   * @example
   * ```ts
   * try {
   *   await schema.parse(data);
   * } catch (err) {
   *   if (err instanceof ZodError) {
   *     const validationError = ValidationError.createFromZodError(err);
   *     throw validationError;
   *   }
   * }
   * ```
   */
  static createFromZodError(error: ZodError) {
    return new ValidationError(formatValidationMessage(error), { base: error, issues: error.issues });
  }

  /**
   * Serializes a ValidationError to JSON for HTTP responses.
   *
   * @throws AssertionError if err is not a ValidationError instance
   *
   * @example
   * ```ts
   * const json = ValidationError.toJSON(error);
   * // {
   * //   "message": "Validation failed for 'email'",
   * //   "issues": [
   * //     {
   * //       "code": "invalid_type",
   * //       "expected": "string",
   * //       "received": "undefined",
   * //       "path": ["email"],
   * //       "message": "Required"
   * //     }
   * //   ]
   * // }
   * ```
   */
  static toJSON(err: unknown) {
    if (err instanceof ValidationError) return { message: err.message, issues: err.issues };
    throw err;
  }

  /** The name of this error class */
  name = ValidationError.name;

  /**
   * Creates a new ValidationError instance.
   *
   * @example
   * ```ts
   * const error = new ValidationError('Validation failed');
   * ```
   */
  constructor(
    public message: string,
    extend: ValidatorErrorOptions = {}
  ) {
    super(message, 422, extend);
    Object.assign(this, extend);
    const { base } = extend;
    if (base && base instanceof Error) {
      this.cause = base.message;
    }
  }
}
