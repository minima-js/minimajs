import type { z, ZodError } from "zod";
import { ValidationError as BaseValidationError, type HttpErrorOptions } from "@minimajs/server/error";

/**
 * Extended options for multipart validation errors.
 */
export interface ValidatorErrorOptions extends HttpErrorOptions {
  /** Array of Zod validation issues */
  issues?: z.core.$ZodIssue[];
}

function formatMessage(issues: z.core.$ZodIssue[], maxFields = 3): string {
  if (issues.length === 0) return "Validation failed";
  if (issues.length === 1) return issues[0]!.message;

  const topIssues = issues.slice(0, maxFields);
  const remaining = issues.length - maxFields;

  const fieldMessages = topIssues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "value";
    return `${path} (${issue.message})`;
  });

  let message = `Validation failed: ${fieldMessages.join(", ")}`;
  if (remaining > 0) {
    message += ` and ${remaining} more ${remaining === 1 ? "field" : "fields"}`;
  }

  return message;
}

/**
 * Validation error for multipart schema validation.
 * Extends the base ValidationError with Zod validation context.
 */
export class ValidationError extends BaseValidationError {
  /** Array of Zod validation issues */
  issues?: z.core.$ZodIssue[];

  /**
   * Creates a ValidationError from a ZodError.
   * Preserves the original Zod issues for full context.
   */
  static createFromZod(zodError: ZodError): ValidationError {
    return new ValidationError(formatMessage(zodError.issues), {
      base: zodError,
      issues: zodError.issues,
    });
  }

  /**
   * Custom toJSON serializer for ValidationError.
   * Returns a clean error response with Zod issues.
   */
  static toJSON = function toJSON(err: ValidationError): unknown {
    const response: { message: unknown; issues?: z.core.$ZodIssue[] } = {
      message: err.response,
    };

    if (err.issues && err.issues.length > 0) {
      response.issues = err.issues;
    }

    return response;
  };

  constructor(message: string, options: ValidatorErrorOptions = {}) {
    super(message, options);

    if (options.issues) {
      this.issues = options.issues;
    }

    if (options.base instanceof Error) {
      this.cause = options.base.message;
    }
  }

  override toJSON(): unknown {
    return ValidationError.toJSON(this);
  }
}
