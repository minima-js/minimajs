import { isObject, toArray } from "./iterable.js";

describe("iterable", () => {
  describe("toArray", () => {
    test("with an array", () => {
      expect(toArray([])).toStrictEqual([]);
    });
    test("with other than an array", () => {
      expect(toArray(1)).toStrictEqual([1]);
    });
  });

  describe("isObject", () => {
    test("with an object", () => {
      expect(isObject({})).toBeTruthy();
    });

    test("with other than object", () => {
      expect(isObject("hello")).toBeFalsy();
    });
  });
});
