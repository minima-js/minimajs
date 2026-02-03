import { describe, test, expect } from "@jest/globals";
import { abort } from "./http.js";
import { HttpError, NotFoundError } from "./error.js";

describe("abort", () => {
  test("rethrow should rethrow non-Error, non-BaseHttpError values", () => {
    // @ts-expect-error
    expect(() => abort.rethrow(nonErrorValue)).toThrow(expect.any(Object));
  });

  describe("abort.rethrow()", () => {
    test("should rethrow HttpError", () => {
      const httpError = new HttpError("Test", 400);
      expect(() => abort.rethrow(httpError)).toThrow(httpError);
    });

    test("should rethrow NotFoundError", () => {
      const notFoundError = new NotFoundError();
      expect(() => abort.rethrow(notFoundError)).toThrow(notFoundError);
    });

    test("should not rethrow regular Error", () => {
      const regularError = new Error("Regular error");
      expect(() => abort.rethrow(regularError)).not.toThrow();
    });

    test("should rethrow non-Error, non-BaseHttpError string", () => {
      const nonErrorValue = "just a string";
      expect(() => abort.rethrow(nonErrorValue)).toThrow(nonErrorValue);
    });

    test("should rethrow non-Error, non-BaseHttpError number", () => {
      const nonErrorValue = 123;
      expect(() => abort.rethrow(nonErrorValue)).toThrow();
    });

    test("should rethrow non-Error, non-BaseHttpError object", () => {
      const nonErrorValue = { error: "custom" };
      expect(() => abort.rethrow(nonErrorValue)).toThrow();
    });

    test("should rethrow AbortError (DOMException)", () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      expect(() => abort.rethrow(abortError)).toThrow(abortError);
    });

    test("should rethrow null", () => {
      expect(() => abort.rethrow(null)).toThrow();
    });

    test("should rethrow undefined", () => {
      expect(() => abort.rethrow(undefined)).toThrow();
    });
  });
});
