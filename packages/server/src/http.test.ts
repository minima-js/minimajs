import { ValidationError } from "./error.js";
import { getBody, getParam, getRequest, getSearchParam } from "./http.js";
import { wrap } from "./internal/context.js";
import { fakeRequest, fakeResponse } from "./internal/context.test.js";

describe("Http", () => {
  describe("getRequest", () => {
    const req = fakeRequest();
    wrap(req, fakeResponse(), () => {
      expect(getRequest().raw).toBe(req.raw);
    });
  });

  describe("getBody", () => {
    wrap(fakeRequest({ body: { message: "Hello, World!" } }), fakeResponse(), () => {
      expect(getBody()).toStrictEqual({ message: "Hello, World!" });
    });
  });

  describe("getSearchParams", () => {
    describe("with value as string", () => {
      wrap(fakeRequest({ query: { name: "John Doe", page: "2" } }), fakeResponse(), () => {
        expect<string | undefined>(getSearchParam("name")).toBe("John Doe");
        expect<string | undefined>(getSearchParam("page")).toBe("2");
        expect<number | undefined>(getSearchParam("page", Number)).toBe(2);
        expect<number>(getSearchParam("page", Number, true)).toBe(2);
        expect<number[] | undefined>(getSearchParam("page", [Number])).toStrictEqual([2]);
        expect<() => string>(() => getSearchParam("pages", true)).toThrow(
          new ValidationError("pages: value is undefined")
        );
      });
    });
    describe("with array as value", () => {
      wrap(fakeRequest({ query: { page: ["1", "2"] } }), fakeResponse(), () => {
        expect<string | undefined>(getSearchParam("page")).toBe("2");
        expect<string>(getSearchParam("page", true)).toBe("2");
        expect<() => number | undefined>(() => getSearchParam("page", Number)).toThrow(
          new ValidationError("page: value is NaN")
        );
      });
    });
  });

  describe("getParam", () => {
    describe("with value as string", () => {
      wrap(fakeRequest({ params: { user: "hello" } }), fakeResponse(), () => {
        expect<string>(getParam("user")).toBe("hello");
        expect<() => string>(() => getParam("unknown")).toThrow("Page not found");
        expect<string | undefined>(getParam("unknown", false)).toBeUndefined();
        expect<() => number | undefined>(() => getParam("user", Number)).toThrow("Page not found");
      });
    });
    describe("with value as number", () => {
      wrap(fakeRequest({ params: { user: "1234" } }), fakeResponse(), () => {
        expect<string>(getParam("user")).toBe("1234");
        expect<number>(getParam("user", Number)).toBe(1234);
      });
    });
  });
});
