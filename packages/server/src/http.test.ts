import { HttpError, ValidationError } from "./error.js";
import {
  abort,
  getBody,
  getHeader,
  getHeaders,
  getParam,
  getRequest,
  getRequestURL,
  getSearchParam,
  getSearchParams,
  setHeader,
  setStatusCode,
} from "./http.js";
import { setTimeout as sleep } from "node:timers/promises";
import { mockContext } from "./mock/context.js";
import { mockApp, mockRoute } from "./mock/index.js";

describe("Http", () => {
  describe("getRequest", () => {
    mockContext((req) => {
      expect(getRequest().raw).toBe(req.raw);
    });
  });

  describe("abort.is", () => {
    test("is aborted", () => {
      expect(abort.is(new HttpError("something is", 202)));
    });
  });

  describe("getRequestURL", () => {
    mockContext((req) => {
      const url = getRequestURL();
      expect(url.host).toBe(req.hostname);
      expect(url.protocol).toBe("http:");
    });
  });
  describe("getBody", () => {
    test("the body", () => {
      const option = { body: { message: "Hello, World!" } };
      mockContext(() => {
        expect(getBody()).toStrictEqual({ message: "Hello, World!" });
      }, option);
    });
  });
  describe("getHeaders", () => {
    test("get all headers", async () => {
      mockContext(
        () => {
          expect(getHeaders().name).toBe("Adil");
        },
        {
          headers: { name: "Adil" },
        }
      );
    });
  });
  describe("getSearchParams", () => {
    test("search param", () => {
      mockContext(
        () => {
          expect(getSearchParams().get("name")).toBe("John Doe");
        },
        {
          url: "/?name=John Doe&page=2",
        }
      );
    });
  });

  describe("getSearchParam", () => {
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

  describe("setStatusCode", () => {
    it("should set status code", async () => {
      const route = mockRoute(() => {
        setStatusCode(300);
        return { message: "hello world" };
      });
      const [response] = await mockApp(route);
      expect(response!.statusCode).toBe(300);
    });
    it("should set status code type", async () => {
      const route = mockRoute(() => {
        setStatusCode("BAD_GATEWAY");
        return { message: "hello world" };
      });
      const [response] = await mockApp(route);
      expect(response!.statusCode).toBe(502);
    });
  });
  describe("set header", () => {
    test("should set header", async () => {
      const route = mockRoute(() => {
        setHeader("x-name", "Adil");
        return { message: "hello world" };
      });
      const [response] = await mockApp(route);
      expect(response!.headers["x-name"]).toBe("Adil");
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
