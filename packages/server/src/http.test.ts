import { getBody, getRequest } from "./http.js";
import { wrap } from "./internal/context.js";
import { fakeRequest, fakeResponse } from "./internal/context.test.js";

describe("Http", () => {
  describe("getRequest", () => {
    wrap(fakeRequest, fakeResponse, () => {
      expect(getRequest().raw).toBe(fakeRequest.raw);
    });
  });

  describe("getBody", () => {
    wrap(fakeRequest, fakeResponse, () => {
      expect(getBody()).toStrictEqual({ message: "Hello, World!" });
    });
  });
});
