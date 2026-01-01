import { describe, test, expect } from "@jest/globals";
import { validateContentSize, validateField, validateFileType } from "./validator.js";
import { File } from "../file.js";
import { z } from "zod";

describe("validator", () => {
  describe("validateFileType", () => {
    const createFile = (name: string, type: string, field = "file"): File => new File(field, name, "utf-8", type);

    test("should validate a valid file with MIME type match", () => {
      const file = createFile("image.jpg", "image/jpeg");
      const accept = ["image/*"];
      expect(validateFileType(file, accept)).toBeTruthy();
    });

    test("should validate a valid file with exact MIME type", () => {
      const file = createFile("video.mp4", "video/mp4");
      const accept = ["video/mp4"];
      expect(validateFileType(file, accept)).toBeTruthy();
    });

    test("should validate a valid file with file extension", () => {
      const file = createFile("document.pdf", "application/pdf");
      const accept = [".pdf"];
      expect(validateFileType(file, accept)).toBeTruthy();
    });

    test("should validate a file with wildcard accept type '*/*'", () => {
      const file = createFile("random.xyz", "application/octet-stream");
      const accept = ["*/*"];
      expect(validateFileType(file, accept)).toBeTruthy();
    });

    test("should throw an error for an invalid file extension", () => {
      const file = createFile("document.txt", "text/plain");
      const accept = [".pdf"];
      expect(validateFileType(file, accept)).toBeFalsy();
    });

    test("should throw an error for an invalid MIME type", () => {
      const file = createFile("audio.mp3", "audio/mpeg");
      const accept = ["video/*"];
      expect(validateFileType(file, accept)).toBeFalsy();
    });

    test("should throw an error if no types match", () => {
      const file = createFile("image.jpg", "image/jpeg");
      const accept = [".pdf", "text/plain"];
      expect(validateFileType(file, accept)).toBeFalsy();
    });

    test("should throw an error for missing file extension in name", () => {
      const file = createFile("unknown", "application/octet-stream");
      const accept = [".pdf"];
      expect(validateFileType(file, accept)).toBeFalsy();
    });

    test("should validate a file with case-insensitive extension", () => {
      const file = createFile("DOCUMENT.PDF", "application/pdf");
      const accept = [".pdf"];
      expect(validateFileType(file, accept)).toBeTruthy();
    });

    test("should validate a file with case-insensitive MIME type", () => {
      const file = createFile("image.JPG", "image/jpeg");
      const accept = ["image/*"];
      expect(validateFileType(file, accept)).toBeTruthy();
    });

    test("should validate multiple accept types", () => {
      const file = createFile("image.jpg", "image/jpeg");
      const accept = ["video/*", ".jpg", "text/plain"];
      expect(validateFileType(file, accept)).toBeTruthy;
    });

    test("should throw an error if both MIME type and extension do not match", () => {
      const file = createFile("audio.wav", "audio/wav");
      const accept = ["image/*", ".mp3"];
      expect(validateFileType(file, accept)).toBeFalsy();
    });
  });

  describe("validateContentSize", () => {
    test("should not throw error if content length is in range", () => {
      expect(() => validateContentSize(1000, 1200)).not.toThrow();
    });

    test("should not throw error if content length is in range", () => {
      expect(() => validateContentSize(1000, 800)).toThrow(
        "Request content length exceeds the limit of 800 B bytes. Actual size: 1000 B bytes."
      );
    });
  });

  describe("validateField", () => {
    test("should be valid field", async () => {
      expect(await validateField("hello", "hello", z.string())).toBe("hello");
    });

    test("auto casting with z.coerce.number", async () => {
      expect(await validateField("hello", "1", z.coerce.number())).toBe(1);
    });

    test("should throw required error", () => {
      return expect(validateField("hello", "", z.string().nonempty())).rejects.toThrow();
    });
  });
});
