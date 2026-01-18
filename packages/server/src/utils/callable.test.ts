import { describe, test, expect } from "@jest/globals";
import { isCallable } from "./callable.js";

describe("isCallable", () => {
  test("should return true for functions", () => {
    const fn = () => {};
    expect(isCallable(fn)).toBe(true);
  });

  test("should return false for non-functions", () => {
    expect(isCallable(null)).toBe(false);
    expect(isCallable(undefined)).toBe(false);
    expect(isCallable(42)).toBe(false);
    expect(isCallable("string")).toBe(false);
    expect(isCallable({})).toBe(false);
  });

  test("should narrow union types correctly", () => {
    type Config = { name: string } | ((x: number) => string);

    const fnConfig: Config = (x) => `value: ${x}`;
    const objConfig: Config = { name: "test" };

    if (isCallable(fnConfig)) {
      const result = fnConfig(42);
      expect(result).toBe("value: 42");
    }

    if (!isCallable(objConfig)) {
      expect(objConfig.name).toBe("test");
    }
  });

  test("should work with lazy initializer pattern", () => {
    type Value<T> = T | (() => T);

    const lazyValue: Value<string> = () => "lazy";
    const directValue: Value<string> = "direct";

    if (isCallable(lazyValue)) {
      expect(lazyValue()).toBe("lazy");
    }

    if (!isCallable(directValue)) {
      expect(directValue).toBe("direct");
    }
  });

  test("should handle when T itself is a function type", () => {
    type Handler = () => void;
    type MaybeFactory = Handler | (() => Handler);

    const factory: MaybeFactory = () => () => {};

    if (isCallable(factory)) {
      const handler = factory();
      expect(typeof handler).toBe("function");
    }
  });
});
