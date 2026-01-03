import { type z } from "zod";
import { HttpError as BaseError, type HttpErrorOptions } from "@minimajs/server/error";
import { ok } from "assert";

export class SchemaError extends Error {}

type ZodIssue = z.core.$ZodIssue;
type ZodError<T = unknown> = z.core.$ZodError<T>;
type ZodErrorMap = z.core.$ZodErrorMap;

/**
 * Options for creating a validation error.
 * Extends HTTP error options with validation-specific properties.
 */
export interface ValidatorErrorOptions extends Omit<HttpErrorOptions, "base"> {
  /** The value that failed validation */
  value?: unknown;
  /** Dot-notation path to the field that failed validation */
  path?: string | (string | number)[];
  /** The type of validation error (e.g., 'required', 'min', 'max') */
  type?: string;
  /** Array of error messages for all validation failures */
  errors?: string[];
  /** Array of zod issues */
  issues?: ZodIssue[];
  /** Nested validation errors for complex object validation */
  inner?: ValidationError[];
  /** The base error */
  base?: Error;
}

export interface ValidationError extends ValidatorErrorOptions {}

export const defaultErrorMap: ZodErrorMap = (issue) => {
  const code = (issue as any).code;
  const received = (issue as any).received;
  const expected = (issue as any).expected;

  switch (code) {
    case "invalid_type":
      if (received === "undefined") {
        return "Required";
      }
      return `Expected ${expected}, received ${received}`;
    default:
      return undefined;
  }
};

/**
 * Custom validation error class for schema validation failures.
 * Extends the base HTTP error with validation-specific properties and methods.
 * Provides integration with Zod validation errors and enhanced error reporting.
 */
export class ValidationError extends BaseError {
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
  static createFromZodError(base: ZodError) {
    const error = new ValidationError(base.message, { base });
    error.issues = base.issues;
    error.inner = base.issues.map((x) => {
      const issueError = new ValidationError(x.message);
      issueError.path = x.path;
      return issueError;
    });
    return error;
  }

  /**
   * Serializes a ValidationError to JSON for HTTP responses.
   *
   * @throws AssertionError if err is not a ValidationError instance
   *
   * @example
   * ```ts
   * const error = new ValidationError('Validation failed', {
   *   errors: ['Email is required', 'Password too short']
   * });
   * const json = ValidationError.toJSON(error);
  // {
  //   "message": "Validation failed",
  //   "issues": [
  //     {
  //       "code": "invalid_type",
  //       "expected": "string",
  //       "received": "undefined",
  //       "path": [
  //         "name"
  //       ],
  //       "message": "Required"
  //     }
  //   ]
  // }
   * ```
   */
  static toJSON(err: unknown) {
    ok(err instanceof ValidationError);
    return { message: err.message, issues: err.issues };
  }

  /** Array of nested validation errors for complex object validation */
  inner: ValidationError[] = [];

  /** The name of this error class */
  name = ValidationError.name;

  /**
   * Creates a new ValidationError instance.
   *
   * @example
   * ```ts
   * const error = new ValidationError('Validation failed', {
   *   path: 'user.email',
   *   type: 'email',
   *   errors: ['Invalid email format']
   * });
   * ```
   */
  constructor(
    public message: string,
    extend: ValidatorErrorOptions = {}
  ) {
    super(message);
    Object.assign(this, extend);
    const { base } = extend;
    if (base && base instanceof Error) {
      this.cause = base.message;
    }
  }
}

export type { ZodErrorMap };
