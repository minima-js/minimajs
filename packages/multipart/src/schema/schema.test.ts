import { describe, test, expect } from "@jest/globals";
import { file, FileSchema } from "./schema.js";

describe("schema builder", () => {
  describe("file", () => {
    test("should create a FileSchema instance", () => {
      const schema = file();
      expect(schema).toBeInstanceOf(FileSchema);
    });

    test("should have max method", () => {
      const schema = file();
      expect(typeof schema.max).toBe("function");
    });

    test("should have min method", () => {
      const schema = file();
      expect(typeof schema.min).toBe("function");
    });

    test("should have accept method", () => {
      const schema = file();
      expect(typeof schema.accept).toBe("function");
    });
  });

  describe("FileSchema", () => {
    describe("max", () => {
      test("should return new FileSchema instance", () => {
        const schema1 = file();
        const schema2 = schema1.max(1024);

        expect(schema2).toBeInstanceOf(FileSchema);
        expect(schema2).not.toBe(schema1);
      });
    });

    describe("min", () => {
      test("should return new FileSchema instance", () => {
        const schema1 = file();
        const schema2 = schema1.min(100);

        expect(schema2).toBeInstanceOf(FileSchema);
        expect(schema2).not.toBe(schema1);
      });
    });

    describe("accept", () => {
      test("should return new FileSchema instance", () => {
        const schema1 = file();
        const schema2 = schema1.accept(["image/*"]);

        expect(schema2).toBeInstanceOf(FileSchema);
        expect(schema2).not.toBe(schema1);
      });
    });

    describe("parse", () => {
      test("should return payload unchanged", () => {
        const schema = file();
        const mockFile = { field: "test" } as any;

        const result = schema.parse(mockFile);

        expect(result).toBe(mockFile);
      });

      test("should work with complex schema", () => {
        const schema = file().max(1024).min(100).accept(["image/*"]);
        const mockFile = { field: "test" } as any;
        const result = schema.parse(mockFile);
        expect(result).toBe(mockFile);
      });
    });
  });
});
