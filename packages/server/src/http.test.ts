import { HttpError, NotFoundError, RedirectError } from "./error.js";
import {
  abort,
  body,
  getBody,
  getHeader,
  getHeaders,
  getParam,
  getParams,
  getQueries,
  getQuery,
  getRequest,
  getRequestURL,
  getRoute,
  getSearchParam,
  getSearchParams,
  headers,
  params,
  redirect,
  request,
  requestURL,
  response,
  route,
  searchParams,
  setHeader,
  setStatusCode,
  status,
} from "./http.js";
import { mockContext } from "./mock/context.js";
import { mockApp, mockRoute } from "./mock/index.js";

describe("Http", () => {
  describe("request / getRequest", () => {
    test("should retrieve request object", () => {
      mockContext((req) => {
        expect(request().raw).toBe(req.raw);
        expect(getRequest().raw).toBe(req.raw);
        expect(request()).toBe(getRequest());
      });
    });
  });

  describe("response", () => {
    test("should retrieve response object", () => {
      mockContext((_req, reply) => {
        expect(response()).toBe(reply);
      });
    });
  });

  describe("requestURL / getRequestURL", () => {
    test("should retrieve request URL", () => {
      mockContext((req) => {
        const url1 = requestURL();
        const url2 = getRequestURL();
        expect(url1.host).toBe(req.hostname);
        expect(url1.protocol).toBe("http:");
        expect(url2.host).toBe(req.hostname);
        expect(url2.protocol).toBe("http:");
        expect(url1).toBe(url2); // should be memoized
      });
    });

    test("should handle custom URL paths", () => {
      mockContext(
        () => {
          const url = requestURL();
          expect(url.pathname).toBe("/users/123");
          expect(url.search).toBe("?page=1");
        },
        { url: "/users/123?page=1" }
      );
    });
  });

  describe("route / getRoute", () => {
    test("should retrieve route options", async () => {
      const testRoute = mockRoute(() => {
        const route1 = route();
        const route2 = getRoute();
        expect(route1).toBeDefined();
        expect(route2).toBeDefined();
        expect(route1).toBe(route2);
        return { message: "ok" };
      });
      await mockApp(testRoute);
    });
  });
  describe("body / getBody", () => {
    test("should retrieve request body", () => {
      const option = { body: { message: "Hello, World!" } };
      mockContext(() => {
        expect(body()).toStrictEqual({ message: "Hello, World!" });
        expect(getBody()).toStrictEqual({ message: "Hello, World!" });
        expect(body()).toBe(getBody());
      }, option);
    });

    test("should handle typed body", () => {
      mockContext(
        () => {
          const data = body<{ name: string; age: number }>();
          expect(data.name).toBe("John");
          expect(data.age).toBe(30);
        },
        { body: { name: "John", age: 30 } }
      );
    });

    test("should handle empty body", () => {
      mockContext(() => {
        expect(body()).toBeUndefined();
      });
    });
  });
  describe("headers / getHeaders", () => {
    test("should retrieve all headers", () => {
      mockContext(
        () => {
          const h1 = headers();
          const h2 = getHeaders();
          expect(h1.name).toBe("Adil");
          expect(h2.name).toBe("Adil");
          expect(h1["x-custom"]).toBe("value");
        },
        { headers: { name: "Adil", "x-custom": "value" } }
      );
    });

    test("headers.get should retrieve single header", () => {
      mockContext(
        () => {
          expect(headers.get("authorization")).toBe("Bearer token");
          expect(headers.get("x-custom")).toBe("value");
          expect(headers.get("x-missing")).toBeUndefined();
        },
        { headers: { authorization: "Bearer token", "x-custom": "value" } }
      );
    });

    test("headers.get with transform should transform value", () => {
      mockContext(
        () => {
          const token = headers.get("authorization", (val) => val.split(" ")[1]);
          expect(token).toBe("token123");

          const length = headers.get("x-custom", (val) => val.length);
          expect(length).toBe(5);
        },
        { headers: { authorization: "Bearer token123", "x-custom": "value" } }
      );
    });

    test("headers.getAll should retrieve all header values", () => {
      mockContext(
        (_req) => {
          const cookies = headers.getAll("cookie");
          expect(cookies).toBeDefined();
          expect(Array.isArray(cookies)).toBe(true);
        },
        { headers: { cookie: "session=123" } }
      );
    });

    test("headers.getAll should return empty array for missing header", () => {
      mockContext(() => {
        const result = headers.getAll("x-missing");
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    test("headers.getAll with transform should transform each value", () => {
      mockContext(
        (_req) => {
          const parsed = headers.getAll("set-cookie", (val) => val.split("="));
          expect(parsed).toEqual([["session", "123"], ["token", "abc"]]);

          const lengths = headers.getAll("set-cookie", (val) => val.length);
          expect(lengths).toEqual([11, 9]);
        },
        { headers: { "set-cookie": ["session=123", "token=abc"] } }
      );
    });

    test("headers.set should set response header", async () => {
      const route = mockRoute(() => {
        headers.set("x-custom", "test-value");
        return { message: "ok" };
      });
      const [response] = await mockApp(route);
      expect(response!.headers["x-custom"]).toBe("test-value");
    });
  });
  describe("searchParams / getSearchParams", () => {
    test("should retrieve all search params", () => {
      mockContext(
        () => {
          const sp1 = searchParams<{ name: string; page: string }>();
          const sp2 = getSearchParams<{ name: string; page: string }>();
          expect(sp1.name).toBe("John Doe");
          expect(sp1.page).toBe("2");
          expect(sp2.name).toBe("John Doe");
          expect(sp2.page).toBe("2");
        },
        { url: "/?name=John Doe&page=2" }
      );
    });

    test("searchParams.get should retrieve single param", () => {
      mockContext(
        () => {
          expect(searchParams.get("name")).toBe("John Doe");
          expect(searchParams.get("page")).toBe("2");
          expect(searchParams.get("missing")).toBeUndefined();
        },
        { url: "/?name=John Doe&page=2" }
      );
    });

    test("searchParams.get with transform should transform value", () => {
      mockContext(
        () => {
          const pageNum = searchParams.get("page", (val) => parseInt(val));
          expect(pageNum).toBe(2);

          const nameUpper = searchParams.get("name", (val) => val.toUpperCase());
          expect(nameUpper).toBe("JOHN DOE");
        },
        { url: "/?name=John Doe&page=2" }
      );
    });

    test("should handle array values", () => {
      mockContext(
        () => {
          expect(searchParams.get("page")).toBe("1"); // gets first value
        },
        { url: "/?page=1&page=2" }
      );
    });

    test("searchParams.getAll should retrieve all param values", () => {
      mockContext(
        () => {
          const tags = searchParams.getAll("tag");
          expect(tags).toEqual(["javascript", "typescript", "node"]);
        },
        { url: "/?tag=javascript&tag=typescript&tag=node" }
      );
    });

    test("searchParams.getAll should return empty array for missing param", () => {
      mockContext(() => {
        const result = searchParams.getAll("missing");
        expect(result).toEqual([]);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    test("searchParams.getAll with transform should transform each value", () => {
      mockContext(
        () => {
          const ids = searchParams.getAll("id", (val) => parseInt(val));
          expect(ids).toEqual([1, 2, 3]);

          const uppercased = searchParams.getAll("tag", (val) => val.toUpperCase());
          expect(uppercased).toEqual(["JS", "TS"]);
        },
        { url: "/?id=1&id=2&id=3&tag=js&tag=ts" }
      );
    });
  });

  describe("getQueries", () => {
    test("should retrieve query string parameters", () => {
      mockContext(
        () => {
          const queries = getQueries<{ name: string; page: string }>();
          expect(queries.name).toBe("John");
          expect(queries.page).toBe("1");
        },
        { url: "/?name=John&page=1" }
      );
    });
  });

  describe("getSearchParam / getQuery (deprecated aliases)", () => {
    test("should be aliases of searchParams.get", () => {
      mockContext(
        () => {
          expect(getSearchParam).toBe(searchParams.get);
          expect(getQuery).toBe(getSearchParam);
          expect(getSearchParam("name")).toBe("John");
        },
        { url: "/?name=John" }
      );
    });
  });

  describe("params / getParams", () => {
    test("should retrieve all params", () => {
      mockContext(
        () => {
          const p1 = params<{ id: string; name: string }>();
          const p2 = getParams<{ id: string; name: string }>();
          expect(p1.id).toBe("123");
          expect(p1.name).toBe("john");
          expect(p2.id).toBe("123");
          expect(p2.name).toBe("john");
        },
        { params: { id: "123", name: "john" } }
      );
    });

    test("params.get should retrieve single param", () => {
      mockContext(
        () => {
          expect(params.get("id")).toBe("123");
          expect(params.get("name")).toBe("john");
        },
        { params: { id: "123", name: "john" } }
      );
    });

    test("params.get should throw NotFoundError for missing param", () => {
      mockContext(
        () => {
          expect(() => params.get("unknown")).toThrow(NotFoundError);
        },
        { params: { id: "123" } }
      );
    });

    test("params.get with transform should transform value", () => {
      mockContext(
        () => {
          const idNum = params.get("id", (val) => parseInt(val));
          expect(idNum).toBe(123);

          const nameUpper = params.get("name", (val) => val.toUpperCase());
          expect(nameUpper).toBe("JOHN");
        },
        { params: { id: "123", name: "john" } }
      );
    });

    test("params.get with transform should throw NotFoundError on NaN", () => {
      mockContext(
        () => {
          expect(() => params.get("name", (val) => parseInt(val))).toThrow(NotFoundError);
        },
        { params: { name: "john" } }
      );
    });

    test("params.optional should retrieve single param", () => {
      mockContext(
        () => {
          expect(params.optional("id")).toBe("123");
          expect(params.optional("name")).toBe("john");
          expect(params.optional("unknown")).toBeUndefined();
        },
        { params: { id: "123", name: "john" } }
      );
    });

    test("params.optional with transform should transform value", () => {
      mockContext(
        () => {
          const idNum = params.optional("id", (val) => parseInt(val));
          expect(idNum).toBe(123);

          const missing = params.optional("unknown", (val) => parseInt(val));
          expect(missing).toBeUndefined();
        },
        { params: { id: "123" } }
      );
    });

    test("params.optional with transform should throw NotFoundError on NaN", () => {
      mockContext(
        () => {
          expect(() => params.optional("name", (val) => parseInt(val))).toThrow(NotFoundError);
        },
        { params: { name: "john" } }
      );
    });
  });

  describe("getParam (deprecated alias)", () => {
    test("should be alias of params.get", () => {
      mockContext(
        () => {
          expect(getParam).toBe(params.get);
          expect(getParam("user")).toBe("hello");
        },
        { params: { user: "hello" } }
      );
    });
  });

  describe("getHeader (deprecated alias)", () => {
    test("should be alias of headers.get", () => {
      mockContext(
        () => {
          expect(getHeader).toBe(headers.get);
          expect(getHeader("x-user")).toBe("1234");
        },
        { headers: { "x-user": "1234" } }
      );
    });
  });

  describe("status / setStatusCode", () => {
    test("should set status code with number", async () => {
      const route = mockRoute(() => {
        status(201);
        return { message: "created" };
      });
      const [response] = await mockApp(route);
      expect(response!.statusCode).toBe(201);
    });

    test("should set status code with StatusCodes key", async () => {
      const route = mockRoute(() => {
        status("CREATED");
        return { message: "created" };
      });
      const [response] = await mockApp(route);
      expect(response!.statusCode).toBe(201);
    });

    test("setStatusCode should work with number", async () => {
      const route = mockRoute(() => {
        setStatusCode(300);
        return { message: "hello world" };
      });
      const [response] = await mockApp(route);
      expect(response!.statusCode).toBe(300);
    });

    test("setStatusCode should work with StatusCodes key", async () => {
      const route = mockRoute(() => {
        setStatusCode("BAD_GATEWAY");
        return { message: "hello world" };
      });
      const [response] = await mockApp(route);
      expect(response!.statusCode).toBe(502);
    });
  });

  describe("setHeader", () => {
    test("should set header", async () => {
      const route = mockRoute(() => {
        setHeader("x-name", "Adil");
        return { message: "hello world" };
      });
      const [response] = await mockApp(route);
      expect(response!.headers["x-name"]).toBe("Adil");
    });

    test("should set multiple headers", async () => {
      const route = mockRoute(() => {
        setHeader("x-name", "Adil");
        setHeader("x-custom", "value");
        return { message: "hello world" };
      });
      const [response] = await mockApp(route);
      expect(response!.headers["x-name"]).toBe("Adil");
      expect(response!.headers["x-custom"]).toBe("value");
    });
  });

  describe("redirect", () => {
    test("should throw RedirectError with path", () => {
      expect(() => redirect("/login")).toThrow(RedirectError);
    });

    test("should throw RedirectError with permanent flag", () => {
      try {
        redirect("/new-url", true);
        fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(RedirectError);
      }
    });

    test("should throw RedirectError with temporary redirect", () => {
      try {
        redirect("/temporary", false);
        fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(RedirectError);
      }
    });
  });

  describe("abort", () => {
    test("should throw HttpError with default message", () => {
      try {
        abort();
        fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).statusCode).toBe(400);
      }
    });

    test("should throw HttpError with custom message and status", () => {
      try {
        abort("Unauthorized", 401);
        fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).statusCode).toBe(401);
      }
    });

    test("abort.notFound should throw NotFoundError", () => {
      expect(() => abort.notFound()).toThrow(NotFoundError);
    });

    test("abort.is should check if error is aborted", () => {
      const httpError = new HttpError("test", 400);
      const regularError = new Error("regular");

      expect(abort.is(httpError)).toBe(true);
      expect(abort.is(regularError)).toBe(false);
    });

    test("abort.assert should re-throw non-abort errors", () => {
      const regularError = new Error("regular");
      expect(() => abort.assert(regularError)).toThrow(regularError);
    });

    test("abort.assert should not throw for abort errors", () => {
      const httpError = new HttpError("test", 400);
      expect(() => abort.assert(httpError)).not.toThrow();
    });

    test("abort.assertNot should re-throw abort errors", () => {
      const httpError = new HttpError("test", 400);
      expect(() => abort.assertNot(httpError)).toThrow(httpError);
    });

    test("abort.assertNot should not throw for non-abort errors", () => {
      const regularError = new Error("regular");
      expect(() => abort.assertNot(regularError)).not.toThrow();
    });
  });
});
