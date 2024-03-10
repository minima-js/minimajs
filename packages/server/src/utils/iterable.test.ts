import { isAsyncIterator, isObject, toArray } from "./iterable.js";

describe("iterable", () => {
  describe("isAsyncIterator", () => {
    test("with async iterator", () => {
      async function* hello() {
        yield "hello";
        yield "world";
      }
      expect(isAsyncIterator(hello())).toBeTruthy();
    });
    test("with normal function", () => {
      async function hello() {
        return "world";
      }
      expect(isAsyncIterator(hello())).toBeFalsy();
    });
  });
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
