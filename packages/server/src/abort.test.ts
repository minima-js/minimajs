import { describe, test, expect } from "@jest/globals";
import { abort } from "./http.js";

describe("abort", () => {
  test("rethrow should rethrow non-Error, non-BaseHttpError values", () => {
    // @ts-expect-error
    expect(() => abort.rethrow(nonErrorValue)).toThrow(expect.any(Object));
  });

  test("rethrow should rethrow non-Error, non-BaseHttpError string", () => {
    const nonErrorValue = "just a string";
    expect(() => abort.rethrow(nonErrorValue)).toThrow(nonErrorValue);
  });
});
