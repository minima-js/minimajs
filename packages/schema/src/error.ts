import { ValidationError as ValidationBaseError } from "yup";
import { ValidationError as BaseError, type HttpErrorOptions } from "@minimajs/server/error";
import { ok } from "assert";

/**
 * Parameters associated with a validation error.
 * Contains detailed information about the validation context and configuration.
 */
interface Params {
  /** The current value being validated */
  value: unknown;
  /** The original value before any transformations */
  originalValue: unknown;
  /** Human-readable label for the field */
  label: string;
  /** Dot-notation path to the field in the object being validated */
  path: string;
  /** Validation specification and configuration */
  spec: Spec;
  /** Whether to disable stack trace generation for this validation */
  disableStackTrace: boolean;
}

/**
 * Validation specification that controls validation behavior.
 * Defines how the validation process should execute and handle different scenarios.
 */
interface Spec {
  /** Whether to remove unspecified keys from objects */
  strip: boolean;
  /** Whether to enforce strict type checking */
  strict: boolean;
  /** Whether to abort validation on the first error encountered */
  abortEarly: boolean;
  /** Whether to validate nested objects recursively */
  recursive: boolean;
  /** Whether to disable stack trace generation */
  disableStackTrace: boolean;
  /** Whether the value can be null */
  nullable: boolean;
  /** Whether the value can be undefined */
  optional: boolean;
  /** Whether to coerce values to the expected type */
  coerce: boolean;
}

/**
 * Options for creating a validation error.
 * Extends HTTP error options with validation-specific properties.
 */
export interface ValidatorErrorOptions extends HttpErrorOptions {
  /** Validation parameters containing context and configuration */
  params?: Params;
  /** The value that failed validation */
  value?: unknown;
  /** Dot-notation path to the field that failed validation */
  path?: string;
  /** The type of validation error (e.g., 'required', 'min', 'max') */
  type?: string;
  /** Array of error messages for all validation failures */
  errors?: string[];
  /** Nested validation errors for complex object validation */
  inner?: ValidationError[];
}

/**
 * Validation error interface.
 * Combines ValidatorErrorOptions with ValidationError class properties.
 */
export interface ValidationError extends ValidatorErrorOptions {}

/**
 * Custom validation error class for schema validation failures.
 * Extends the base HTTP error with validation-specific properties and methods.
 * Provides integration with Yup validation errors and enhanced error reporting.
 */
export class ValidationError extends BaseError {
  /**
   * Creates a ValidationError from a Yup ValidationBaseError.
   * Recursively converts nested validation errors.
   *
   * @example
   * ```ts
   * try {
   *   await schema.validate(data);
   * } catch (err) {
   *   if (err instanceof YupValidationError) {
   *     const validationError = ValidationError.createFromBase(err);
   *     throw validationError;
   *   }
   * }
   * ```
   */
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
  constructor(public message: string, extend: ValidatorErrorOptions = {}) {
    super(message);
    Object.assign(this, extend);
    const { base } = extend;
    if (base && base instanceof Error) {
      this.cause = base.message;
    }
  }
}

/**
 * Serializes a ValidationError to JSON for HTTP responses.
 * Returns either just the message (if abortEarly is true) or the message with all errors.
 *
 * @throws AssertionError if err is not a ValidationError instance
 *
 * @example
 * ```ts
 * const error = new ValidationError('Validation failed', {
 *   errors: ['Email is required', 'Password too short']
 * });
 * const json = ValidationError.toJSON(error);
 * // { message: '...', errors: ['Email is required', 'Password too short'] }
 * ```
 */
ValidationError.toJSON = function toJSON(err: unknown) {
  ok(err instanceof ValidationError);
  if (err.params?.spec.abortEarly) {
    return { message: err.response };
  }
  return { message: err.response, errors: err.errors };
};
