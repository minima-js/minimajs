import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import { maxFileSizeError, maxLengthError } from "./zod-error.js";
import { Readable } from "node:stream";
import type { MultipartRawFile } from "../types.js";
import { RAW_FILE } from "../raw/index.js";

describe("zod-error", () => {
  function createRawFile(fieldname: string): MultipartRawFile {
    return {
      [RAW_FILE]: true,
      fieldname,
      filename: "test.txt",
      stream: Object.assign(Readable.from([]), { truncated: false, bytesRead: 0 }),
      mimeType: "text/plain",
      transferEncoding: "7bit",
    } as MultipartRawFile;
  }

  describe("maxFileSizeError", () => {
    test("should create ZodError with correct structure", () => {
      const schema = z.file().max(1024);
      const rawFile = createRawFile("document");

      const error = maxFileSizeError(schema, rawFile, 2048);

      expect(error).toBeInstanceOf(z.ZodError);
      expect(error.issues).toHaveLength(1);
      expect(error.issues[0]).toMatchObject({
        code: "too_big",
        origin: "file",
        maximum: 1024,
        input: 2048,
        path: ["document"],
      });
    });

    test("should include human-readable file sizes in message", () => {
      const schema = z.file().max(1024 * 1024); // 1 MiB
      const rawFile = createRawFile("upload");

      const error = maxFileSizeError(schema, rawFile, 2 * 1024 * 1024);

      expect(error.issues[0]!.message).toContain("1.0 MiB");
      expect(error.issues[0]!.message).toContain("2.0 MiB");
    });

    test("should use fieldname as path", () => {
      const schema = z.file().max(100);
      const rawFile = createRawFile("avatar");

      const error = maxFileSizeError(schema, rawFile, 200);

      expect(error.issues[0]!.path).toEqual(["avatar"]);
    });
  });

  describe("maxLengthError", () => {
    test("should create ZodError with correct structure", () => {
      const schema = z.array(z.file()).max(3);

      const error = maxLengthError(schema, 5, "files");

      expect(error).toBeInstanceOf(z.ZodError);
      expect(error.issues).toHaveLength(1);
      expect(error.issues[0]).toMatchObject({
        code: "too_big",
        origin: "array",
        maximum: 3,
        input: 5,
        path: ["files"],
      });
    });

    test("should include descriptive message", () => {
      const schema = z.array(z.file()).max(2);

      const error = maxLengthError(schema, 4, "attachments");

      expect(error.issues[0]!.message).toBe("Maximum supported file exceed");
    });
  });
});
