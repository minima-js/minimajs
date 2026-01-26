import { describe, test, expect } from "@jest/globals";
import { UploadError } from "./errors.js";

describe("errors", () => {
  describe("UploadError", () => {
    test("should preserve stack trace", () => {
      const error = new UploadError("Test error", 400);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("UploadError");
    });
  });
});
