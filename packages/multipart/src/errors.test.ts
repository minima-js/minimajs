import { describe, test, expect } from "@jest/globals";
import { UploadError } from "./errors.js";

describe("errors", () => {
  describe("UploadError", () => {
    test("should preserve stack trace", () => {
      const error = new UploadError("Test error", 400);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("UploadError");
    });

    test("should have correct name property", () => {
      const error = new UploadError("Test error", 400);
      expect(error.name).toBe("UploadError");
    });

    test("should extend HttpError with correct status", () => {
      const error = new UploadError("Test error", 422);
      expect(error.status).toBe(422);
    });

    test("should accept object response", () => {
      const error = new UploadError({ code: "INVALID_FILE", message: "Bad file" }, 400);
      expect(error.response).toEqual({ code: "INVALID_FILE", message: "Bad file" });
    });
  });
});
