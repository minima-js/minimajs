import { describe, test, expect } from "@jest/globals";
import { z, ZodError } from "zod";
import { ValidationError, SchemaError } from "./error.js";

describe("error", () => {
  describe("SchemaError", () => {
    test("should create SchemaError instance", () => {
      const error = new SchemaError("Schema error");

      expect(error).toBeInstanceOf(SchemaError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Schema error");
    });

    test("should be throwable", () => {
      expect(() => {
        throw new SchemaError("Test error");
      }).toThrow(SchemaError);
    });
  });

  describe("ValidationError", () => {
    test("should create ValidationError with message", () => {
      const error = new ValidationError("Validation failed");

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Validation failed");
      expect(error.status).toBe(422);
    });

    test("should accept options with issues", () => {
      const issues: any[] = [
        {
          code: "invalid_type",
          expected: "string",
          received: "undefined",
          path: ["email"],
          message: "Required",
        },
      ];

      const error = new ValidationError("Validation failed", { issues });

      expect(error.issues).toEqual(issues);
    });

    test("should set cause from base error", () => {
      const baseError = new Error("Base error message");
      const error = new ValidationError("Validation failed", { base: baseError });

      expect(error.cause).toBe("Base error message");
    });

    test("should have name property", () => {
      const error = new ValidationError("Test");

      expect(error.name).toBe("ValidationError");
    });

    describe("createFromZodError", () => {
      test("should create ValidationError from ZodError with single issue", () => {
        const schema = z.object({ email: z.string() });

        try {
          schema.parse({});
          throw new Error("Should have thrown");
        } catch (err) {
          if (err instanceof ZodError) {
            const validationError = ValidationError.createFromZodError(err);

            expect(validationError).toBeInstanceOf(ValidationError);
            expect(validationError.message).toContain("email");
            expect(validationError.issues).toBeDefined();
            expect(validationError.issues?.length).toBeGreaterThan(0);
          }
        }
      });

      test("should format message with multiple fields", () => {
        const schema = z.object({
          email: z.string(),
          name: z.string(),
          age: z.number(),
        });

        try {
          schema.parse({});
        } catch (err) {
          if (err instanceof ZodError) {
            const validationError = ValidationError.createFromZodError(err);

            expect(validationError.message).toMatch(/Validation failed for/);
            expect(validationError.message).toContain("email");
            expect(validationError.message).toContain("name");
          }
        }
      });

      test("should show 'and X more' when more than 3 issues", () => {
        const schema = z.object({
          field1: z.string(),
          field2: z.string(),
          field3: z.string(),
          field4: z.string(),
          field5: z.string(),
        });

        try {
          schema.parse({});
        } catch (err) {
          if (err instanceof ZodError) {
            const validationError = ValidationError.createFromZodError(err);

            expect(validationError.message).toMatch(/and \d+ more/);
          }
        }
      });

      test("should handle nested object validation errors", () => {
        const schema = z.object({
          user: z.object({
            email: z.string().email(),
          }),
        });

        try {
          schema.parse({ user: { email: "invalid" } });
        } catch (err) {
          if (err instanceof ZodError) {
            const validationError = ValidationError.createFromZodError(err);

            expect(validationError).toBeInstanceOf(ValidationError);
            expect(validationError.issues).toBeDefined();
          }
        }
      });

      test("should preserve original ZodError issues", () => {
        const schema = z.object({ email: z.string().email() });

        try {
          schema.parse({ email: "invalid-email" });
        } catch (err) {
          if (err instanceof ZodError) {
            const validationError = ValidationError.createFromZodError(err);

            expect(validationError.issues).toEqual(err.issues);
          }
        }
      });
    });

    describe("toJSON", () => {
      test("should serialize ValidationError to JSON", () => {
        const issues: any[] = [
          {
            code: "invalid_type",
            expected: "string",
            received: "undefined",
            path: ["email"],
            message: "Required",
          },
        ];

        const error = new ValidationError("Validation failed for 'email'", { issues });
        const json = ValidationError.toJSON(error);

        expect(json).toEqual({
          message: "Validation failed for 'email'",
          issues,
        });
      });

      test("should throw for non-ValidationError", () => {
        const regularError = new Error("Regular error");

        expect(() => ValidationError.toJSON(regularError)).toThrow();
      });

      test("should handle ValidationError without issues", () => {
        const error = new ValidationError("Validation failed");
        const json = ValidationError.toJSON(error);

        expect(json).toEqual({
          message: "Validation failed",
          issues: undefined,
        });
      });

      test("should work with ValidationError from ZodError", () => {
        const schema = z.object({ email: z.string() });

        try {
          schema.parse({});
        } catch (err) {
          if (err instanceof ZodError) {
            const validationError = ValidationError.createFromZodError(err);
            const json = ValidationError.toJSON(validationError);

            expect(json.message).toBeDefined();
            expect(json.issues).toBeDefined();
            expect(Array.isArray(json.issues)).toBe(true);
          }
        }
      });
    });
  });
});
