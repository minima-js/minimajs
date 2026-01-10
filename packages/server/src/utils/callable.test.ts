import { describe, test, expect } from "@jest/globals";
import { isCallable } from "./callable.js";

describe("callable", () => {
  test("isCallable", () => {
    function hello() {}
    expect(isCallable(hello)).toBeTruthy();
  });
});
