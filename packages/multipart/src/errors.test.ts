import { describe, test, expect } from "@jest/globals";
import { UploadError, assertError } from "./errors.js";

describe("errors", () => {
  describe("UploadError", () => {
    test("should create error with string message", () => {
      const error = new UploadError("Upload failed");

      expect(error).toBeInstanceOf(UploadError);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe("Upload failed");
      expect(error.statusCode).toBe(422);
    });

    test("should create error with object response", () => {
      const response = { message: "Invalid file type" };
      const error = new UploadError(response);

      expect(error).toBeInstanceOf(UploadError);
      expect(error.message).toBe("Invalid file type");
      expect(error.statusCode).toBe(422);
    });

    test("should default to 422 status code", () => {
      const error = new UploadError("Test error");

      expect(error.statusCode).toBe(422);
    });

    test("should accept custom options", () => {
      const error = new UploadError("Test error", { cause: new Error("Root cause") });

      expect(error.cause).toBeInstanceOf(Error);
      expect((error.cause as Error).message).toBe("Root cause");
    });

    test("should have correct name", () => {
      const error = new UploadError("Test error");

      expect(error.name).toBe("UploadError");
    });

    test("should be throwable", () => {
      expect(() => {
        throw new UploadError("Test error");
      }).toThrow(UploadError);
    });

    test("should preserve stack trace", () => {
      const error = new UploadError("Test error");

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("UploadError");
    });

    test("should handle complex error messages", () => {
      const error = new UploadError({
        message: "File validation failed",
        details: ["File too large", "Invalid mime type"],
      });

      expect(error.message).toBe("File validation failed");
    });

    test("should be catchable with instanceof", () => {
      try {
        throw new UploadError("Test");
      } catch (err) {
        expect(err).toBeInstanceOf(UploadError);
        expect(err).toBeInstanceOf(Error);
      }
    });
  });

  describe("assertError", () => {
    test("should not throw if error is of expected type", () => {
      const error = new UploadError("Test");

      expect(() => {
        assertError(error, UploadError);
      }).not.toThrow();
    });

    test("should throw if error is not of expected type", () => {
      const error = new Error("Generic error");

      expect(() => {
        assertError(error, UploadError);
      }).toThrow(Error);

      expect(() => {
        assertError(error, UploadError);
      }).toThrow("Generic error");
    });

    test("should narrow error type after assertion", () => {
      const error: unknown = new UploadError("Test");

      assertError(error, UploadError);

      // TypeScript should now know error is UploadError
      expect(error.statusCode).toBe(422);
    });

    test("should work with other error types", () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom");

      expect(() => {
        assertError(error, CustomError);
      }).not.toThrow();
    });

    test("should throw original error when type doesn't match", () => {
      const originalError = new Error("Original");

      try {
        assertError(originalError, UploadError);
        fail("Should have thrown");
      } catch (err) {
        expect(err).toBe(originalError);
      }
    });

    test("should handle non-Error objects", () => {
      const notAnError = { message: "Not an error" };

      expect(() => {
        assertError(notAnError, UploadError);
      }).toThrow();
    });

    test("should handle null", () => {
      expect(() => {
        assertError(null, UploadError);
      }).toThrow();
    });

    test("should handle undefined", () => {
      expect(() => {
        assertError(undefined, UploadError);
      }).toThrow();
    });

    test("should work in catch blocks", () => {
      try {
        throw new UploadError("Upload failed");
      } catch (err) {
        assertError(err, UploadError);
        expect(err.statusCode).toBe(422);
      }
    });

    test("should rethrow if wrong error type in catch", () => {
      expect(() => {
        try {
          throw new Error("Generic error");
        } catch (err) {
          assertError(err, UploadError);
        }
      }).toThrow(Error);
    });

    test("should work with inheritance", () => {
      class SpecificUploadError extends UploadError {
        constructor(message: string) {
          super(message);
          this.name = "SpecificUploadError";
        }
      }

      const error = new SpecificUploadError("Specific error");

      expect(() => {
        assertError(error, UploadError);
      }).not.toThrow();
    });

    test("should not work for parent class when child expected", () => {
      class SpecificUploadError extends UploadError {}

      const error = new UploadError("Generic upload error");

      expect(() => {
        assertError(error, SpecificUploadError);
      }).toThrow();
    });
  });

  describe("UploadError integration", () => {
    test("should be usable in async functions", async () => {
      async function uploadFile() {
        throw new UploadError("Async upload failed");
      }

      await expect(uploadFile()).rejects.toThrow(UploadError);
      await expect(uploadFile()).rejects.toThrow("Async upload failed");
    });

    test("should preserve context across async boundaries", async () => {
      async function nestedUpload() {
        await Promise.resolve();
        throw new UploadError("Nested error");
      }

      try {
        await nestedUpload();
        fail("Should have thrown");
      } catch (err) {
        assertError(err, UploadError);
        expect(err.message).toBe("Nested error");
      }
    });

    test("should work with Promise.reject", () => {
      const promise = Promise.reject(new UploadError("Rejected"));

      return expect(promise).rejects.toThrow(UploadError);
    });
  });
});
