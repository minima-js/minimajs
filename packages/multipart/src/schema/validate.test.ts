import { describe, test, expect } from "@jest/globals";
import { z } from "zod";
import { maxLength } from "./validate.js";

describe("maxLength", () => {
  test("should not throw when schema has no maximum set", () => {
    const schema = z.array(z.string());
    expect(() => maxLength(schema, 10, "files")).not.toThrow();
  });

  test("should not throw when length is less than maximum", () => {
    const schema = z.array(z.string()).max(5);
    expect(() => maxLength(schema, 3, "files")).not.toThrow();
  });

  test("should throw ZodError when length equals maximum", () => {
    const schema = z.array(z.string()).max(5);
    expect(() => maxLength(schema, 5, "files")).toThrow(z.ZodError);
  });

  test("should throw ZodError when length exceeds maximum", () => {
    const schema = z.array(z.string()).max(5);
    expect(() => maxLength(schema, 10, "files")).toThrow(z.ZodError);
  });

  test("should include correct error details", () => {
    const schema = z.array(z.string()).max(3);
    let error: z.ZodError | undefined;
    try {
      maxLength(schema, 5, "avatars");
    } catch (err) {
      error = err as z.ZodError;
    }
    expect(error).toBeInstanceOf(z.ZodError);
    expect(error!.issues).toHaveLength(1);
    expect(error!.issues[0]).toMatchObject({
      code: "too_big",
      path: ["avatars"],
      maximum: 3,
      input: 5,
    });
  });
});
