import { describe, test, expect } from "@jest/globals";
import { has } from "./index.js";

describe("has", () => {
  test("should check property existence on objects", () => {
    const obj = { name: "test", age: 25 };
    expect(has(obj, "name")).toBe(true);
    expect(has(obj, "missing")).toBe(false);
  });

  test("should check properties on arrays", () => {
    const arr = [1, 2, 3];
    expect(has(arr, "0")).toBe(true);
    expect(has(arr, "length")).toBe(true);
    expect(has(arr, "10")).toBe(false);
  });

  test("should check properties on functions", () => {
    function fn() {}
    fn.custom = "value";
    expect(has(fn, "custom")).toBe(true);
    expect(has(fn, "call")).toBe(true);
    expect(has(fn, "missing")).toBe(false);
  });

  test("should return false for null and undefined", () => {
    expect(has(null, "prop")).toBe(false);
    expect(has(undefined, "prop")).toBe(false);
  });

  test("should work with symbols", () => {
    const sym = Symbol("test");
    const obj = { [sym]: "value" };
    expect(has(obj, sym)).toBe(true);
  });

  test("should narrow unknown type", () => {
    const a: unknown = { hi: "world" };

    if (has(a, "hi")) {
      expect(a.hi).toBe("world");
      // TypeScript infers: a is Record<"hi", unknown>
    }
  });

  test("should narrow union types", () => {
    type Config = { value: string } | { execute: () => string };
    const config: Config = { value: "test" };

    if (has(config, "value")) {
      expect(config.value).toBe("test");
    }
  });

  test("should work with optional properties", () => {
    interface Data {
      required: string;
      optional?: number;
    }
    const data: Data = { required: "test" };

    expect(has(data, "required")).toBe(true);
    expect(has(data, "optional")).toBe(false);
  });
});

describe("has.fn", () => {
  test("should check for callable properties", () => {
    const obj = { method() {}, value: 42 };
    expect(has.fn(obj, "method")).toBe(true);
    expect(has.fn(obj, "value")).toBe(false);
    expect(has.fn(obj, "missing")).toBe(false);
  });

  test("should work with built-in methods", () => {
    const arr = [1, 2, 3];
    expect(has.fn(arr, "push")).toBe(true);
    expect(has.fn(arr, "map")).toBe(true);
    expect(has.fn(arr, "length")).toBe(false);
  });

  test("should return false for null and undefined", () => {
    expect(has.fn(null, "method")).toBe(false);
    expect(has.fn(undefined, "method")).toBe(false);
  });

  test("should narrow type to callable", () => {
    type Config = { execute?: () => string; value?: string };
    const config: Config = { execute: () => "result" };

    if (has.fn(config, "execute")) {
      expect(config.execute()).toBe("result");
      // TypeScript infers: config.execute is (...args: unknown[]) => unknown
    }
  });

  test("should narrow unknown type with callable check", () => {
    const a: unknown = { run: () => "done" };

    if (has.fn(a, "run")) {
      expect(a.run()).toBe("done");
      // TypeScript infers: a is Record<"run", (...args: unknown[]) => unknown>
    }
  });
});
