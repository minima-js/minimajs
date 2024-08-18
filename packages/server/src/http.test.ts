import { ValidationError } from "./error.js";
import { getBody, getHeader, getParam, getRequest, getRequestURL, getSearchParam } from "./http.js";
import { setTimeout as sleep } from "node:timers/promises";
import { mockContext } from "./mock/context.js";

describe("Http", () => {
  describe("getRequest", () => {
    mockContext((req) => {
      expect(getRequest().raw).toBe(req.raw);
    });
  });

  describe("getRequestURL", () => {
    mockContext((req) => {
      const url = getRequestURL();
      expect(url.host).toBe(req.hostname);
      expect(url.protocol).toBe("http:");
    });
  });

  test("getBody", () => {
    const option = { body: { message: "Hello, World!" } };
    mockContext(() => {
      expect(getBody()).toStrictEqual({ message: "Hello, World!" });
    }, option);
  });

  describe("getSearchParams", () => {
    test("with value as string", () => {
      mockContext(
        () => {
          expect<string | undefined>(getSearchParam("name")).toBe("John Doe");
          // @ts-expect-error
          expect(getSearchParam("name").length).toBe(8);
          expect<string | undefined>(getSearchParam("page")).toBe("2");
          expect<number | undefined>(getSearchParam("page", Number)).toBe(2);
          expect<number>(getSearchParam("page", Number, true)).toBe(2);
          expect<number[] | undefined>(getSearchParam("page", [Number])).toStrictEqual([2]);
          expect<() => string>(() => getSearchParam("pages", true)).toThrow(
            new ValidationError("Param `pages` is required")
          );
          expect<{ name: string | string[] } | undefined>(getSearchParam("name", getSearch)).toStrictEqual(
            getSearch("John Doe")
          );
        },
        {
          url: "/?name=John Doe&page=2",
        }
      );
    });
    test("with array as value", () => {
      mockContext(
        () => {
          expect<string | undefined>(getSearchParam("page")).toBe("2");
          expect<string>(getSearchParam("page", true)).toBe("2");
          expect<() => number | undefined>(() => getSearchParam("page", Number)).toThrow(
            new ValidationError("Param `page` expects a number, received '1,2'")
          );
        },
        { url: "?page=1&page=2" }
      );
    });
  });

  describe("getParam", () => {
    test("with value as string", () => {
      mockContext(
        () => {
          expect<string>(getParam("user")).toBe("hello");
          expect<() => string>(() => getParam("unknown")).toThrow("Page not found");
          expect<string | undefined>(getParam("unknown", false)).toBeUndefined();
          expect<() => number | undefined>(() => getParam("user", Number)).toThrow("Page not found");
        },
        { params: { user: "hello" } }
      );
    });
    test("with value as number", () => {
      return mockContext(
        async () => {
          expect<string>(getParam("user")).toBe("1234");
          expect<number>(getParam("user", Number)).toBe(1234);
          expect<{ id: string }>(await getParam("user", getUser)).toStrictEqual(await getUser("1234"));
        },
        { params: { user: "1234" } }
      );
    });
  });

  describe("getHeader", () => {
    test("with default header", () => {
      return mockContext(
        async () => {
          expect<string | undefined>(getHeader("x-user")).toBe("1234");
          // @ts-expect-error
          expect(getHeader("x-user").length).toBe(4);
          expect<number | undefined>(getHeader("x-user", Number)).toBe(1234);
          expect<number[] | undefined>(getHeader("x-user", [Number])).toStrictEqual([1234]);
          expect<string>(getHeader("x-user", true)).toBe("1234");
          expect<{ user: string }>(getHeader("x-user", getHeaderResult, true)).toStrictEqual(getHeaderResult(["1234"]));
        },
        {
          headers: { "x-user": "1234" },
        }
      );
    });
  });
});

function getHeaderResult(user: string[]) {
  return { user: String(user) };
}

function getSearch(name: string | string[]) {
  return { name };
}

async function getUser(id: string) {
  await sleep(1);
  return { id: String(id) };
}
