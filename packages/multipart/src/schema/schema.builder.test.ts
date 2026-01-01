import { describe, test, expect } from "@jest/globals";
import { file, extractTests } from "./schema.js";

describe("schema builder", () => {
  test("should extract metadata from file builder", () => {
    const shape = {
      avatar: file().max(1024).accept(["image/*"]),
      docs: file().max(10 * 1024 * 1024),
    } as any;

    const tests = extractTests(shape);
    expect(tests.avatar).toBeDefined();
    expect(tests.avatar!.max).toBe(1024);
    expect(tests.avatar!.accept).toEqual(["image/*"]);
    expect(tests.docs).toBeDefined();
    expect(tests.docs!.max).toBe(10 * 1024 * 1024);
  });
});
