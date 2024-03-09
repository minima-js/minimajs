import { isCallable } from "./callable.js";

describe("callable", () => {
  test("isCallable", () => {
    function hello() {}
    expect(isCallable(hello)).toBeTruthy();
  });
});
