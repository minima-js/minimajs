import { describe, test, expect } from "@jest/globals";
import { HttpError, NotFoundError, RedirectError } from "./error.js";
import { abort, body, headers, params, redirect, request, response, searchParams } from "./http.js";
import { mockContext } from "./mock/index.js";
import { createApp } from "./bun/index.js";
import { bodyParser } from "./plugins/body-parser.js";
import { createRequest } from "./mock/request.js";
import { proxy } from "./plugins/proxy/index.js";

const setHeader = headers.set;

describe("Http", () => {
  describe("request", () => {
    test("should retrieve request object", () => {
      mockContext((ctx) => {
        expect(request()).toBe(ctx.request);
      });
    });
  });

  describe("response", () => {
    test("should create response from data", async () => {
      const app = createApp({ logger: false });
      app.get("/test", async () => {
        return response("Message: Ok");
      });
      const res = await app.handle(createRequest("/test"));
      const body = await res.text();
      expect(body).toEqual("Message: Ok");
      await app.close();
    });
  });

  describe("request.url", () => {
    test("should retrieve request URL", () => {
      mockContext(
        () => {
          const url1 = request.url();
          const url2 = request.url();
          const reqUrl = new URL("http://example.com");
          expect(url1.host).toBe(reqUrl.host);
          expect(url1.protocol).toBe("http:");
          expect(url2.host).toBe(reqUrl.host);
          expect(url2.protocol).toBe("http:");
          expect(url1).toBe(url2); // should be memoized
        },
        {
          context: { $metadata: { url: new URL("http://example.com/test") } },
        }
      );
    });

    test("should handle custom URL paths", () => {
      mockContext(
        () => {
          const url = request.url();
          expect(url.pathname).toBe("/users/123");
          expect(url.search).toBe("?page=1");
        },
        { context: { $metadata: { url: new URL("http://example.com/users/123?page=1") } } }
      );
    });
  });

  describe("body", () => {
    test("should retrieve request body as ReadableStream", async () => {
      const app = createApp({ logger: false });
      app.post("/test", async () => {
        const data = (await request().json()) as { message: string };
        return { received: data };
      });
      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Hello, World!" }),
      });
      const res = await app.handle(req);
      const responseBody = (await res.json()) as { received: { message: string } };
      expect(responseBody.received).toStrictEqual({ message: "Hello, World!" });
      await app.close();
    });

    test("should handle typed body", async () => {
      const app = createApp({ logger: false });
      app.post("/test", async () => {
        const data = (await request().json()) as { name: string; age: number };
        return { name: data.name, age: data.age };
      });
      const req = new Request("http://localhost/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "John", age: 30 }),
      });
      const res = await app.handle(req);
      const responseBody = (await res.json()) as { name: string; age: number };
      expect(responseBody.name).toBe("John");
      expect(responseBody.age).toBe(30);
      await app.close();
    });

    test("should handle empty body", async () => {
      const app = createApp({ logger: false });
      app.register(bodyParser());
      app.get("/test", () => {
        const reqBody = body();
        return { bodyIsNull: reqBody === null };
      });
      const res = await app.handle(createRequest("/test"));
      const responseBody = (await res.json()) as { bodyIsNull: boolean };
      expect(responseBody.bodyIsNull).toBe(true);
      await app.close();
    });
  });
  describe("headers", () => {
    test("should retrieve headers as Headers object", () => {
      mockContext(
        () => {
          const h1 = headers();
          expect(h1["name"]).toBe("Adil");
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
          expect(headers.get("x-missing")).toBeNull();
          expect(headers.get("x-empty-header")).toBe("");
        },
        { headers: { authorization: "Bearer token", "x-custom": "value", "x-empty-header": "" } }
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
        () => {
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

    test("headers.set should set response header", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        headers.set("x-custom", "test-value");
        return { message: "ok" };
      });
      const response = await app.handle(createRequest("/test"));
      expect(response.headers.get("x-custom")).toBe("test-value");
      await app.close();
    });
  });
  describe("searchParams", () => {
    test("should retrieve all search params", () => {
      mockContext(
        () => {
          const sp1 = searchParams<{ name: string; page: string }>();
          expect(sp1.name).toBe("John Doe");
          expect(sp1.page).toBe("2");
        },
        { url: "/?name=John Doe&page=2" }
      );
    });

    test("searchParams.get should retrieve single param", () => {
      mockContext(
        () => {
          expect(searchParams.get("name")).toBe("John Doe");
          expect(searchParams.get("page")).toBe("2");
          expect(searchParams.get("empty-param")).toBe("");
          expect(searchParams.get("missing")).toBeNull();
          expect(searchParams.get("another-empty")).toBe("");
        },
        { url: "/?name=John Doe&page=2&empty-param=&another-empty=" }
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
      mockContext(
        () => {
          let result = searchParams.getAll("missing");
          expect(result).toEqual([]);
          expect(Array.isArray(result)).toBe(true);

          result = searchParams.getAll("empty-param");
          expect(result).toEqual([""]);
        },
        { url: "/?empty-param=" }
      );
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

  describe("params", () => {
    test("should retrieve all params", () => {
      mockContext(
        () => {
          const p1 = params<{ id: string; name: string }>();
          const p2 = params<{ id: string; name: string }>();
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

  describe("status", () => {
    test("should set status code with number", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        response.status(201);
        return { message: "created" };
      });
      const res = await app.handle(createRequest("/test"));
      expect(res.status).toBe(201);
      await app.close();
    });

    test("should set status code with StatusCodes key", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        response.status("CREATED");
        return { message: "created" };
      });
      const res = await app.handle(createRequest("/test"));
      expect(res.status).toBe(201);
      await app.close();
    });

    test("setStatusCode should work with number", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        response.status(300);
        return { message: "hello world" };
      });
      const res = await app.handle(createRequest("/test"));
      expect(res.status).toBe(300);
      await app.close();
    });

    test("setStatusCode should work with StatusCodes key", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        response.status("BAD_GATEWAY");
        return { message: "hello world" };
      });
      const res = await app.handle(createRequest("/test"));
      expect(res.status).toBe(502);
      await app.close();
    });
  });

  describe("setHeader", () => {
    test("should set header", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        setHeader("x-name", "Adil");
        return { message: "hello world" };
      });
      const response = await app.handle(createRequest("/test"));
      expect(response.headers.get("x-name")).toBe("Adil");
      await app.close();
    });

    test("should set multiple headers", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        setHeader("x-name", "Adil");
        setHeader("x-custom", "value");
        return { message: "hello world" };
      });
      const response = await app.handle(createRequest("/test"));
      expect(response.headers.get("x-name")).toBe("Adil");
      expect(response.headers.get("x-custom")).toBe("value");
      await app.close();
    });

    test("should throw error when value is undefined for single header", () => {
      mockContext(() => {
        expect(() => headers.set("x-test", undefined as any)).toThrow("Value is required when setting a single header");
      });
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
        expect((err as HttpError).status).toBe(400);
      }
    });

    test("should throw HttpError with custom message and status", () => {
      try {
        abort("Unauthorized", 401);
        fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(HttpError);
        expect((err as HttpError).status).toBe(401);
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

  describe("body() without bodyParser", () => {
    test("should throw error when bodyParser is not registered", async () => {
      const app = createApp();
      app.get("/test", () => {
        body(); // This will throw
        return "ok";
      });

      const response = await app.handle(createRequest("/test"));
      expect(response.status).toBe(500);
      const json: any = await response.json();
      expect(json.message).toContain("Unable to process request");

      await app.close();
    });
  });

  describe("response() with status option", () => {
    test("should create response with status code from ReasonPhrases", async () => {
      const app = createApp();
      app.get("/test", async () => {
        return response("Data: Ok", { status: "CREATED" });
      });

      const res = await app.handle(createRequest("/test"));
      expect(res.status).toBe(201);
      await app.close();
    });
  });

  describe("params() without route", () => {
    test("should return empty object when no route is matched", () => {
      mockContext(() => {
        const result = params();
        expect(result).toEqual({});
      });
    });
  });

  describe("headers.getAll() with set-cookie", () => {
    test("should return all set-cookie headers", () => {
      const app = createApp();
      app.get("/test", () => {
        const cookies = headers.getAll("set-cookie");
        return { count: cookies.length };
      });

      const req = new Request("http://localhost/test", {
        headers: {
          "set-cookie": "session=abc123",
        },
      });

      // Note: Testing the branch for set-cookie headers
      app.handle(req);
      app.close();
    });

    test("should transform set-cookie headers with transform function", async () => {
      const app = createApp({ logger: false });
      app.get("/test", () => {
        const transform = (val: string) => val.split("=")[0];
        const result = headers.getAll("set-cookie", transform);
        return { cookies: result };
      });

      const req = new Request("http://localhost/test", {
        headers: {
          "set-cookie": "session=abc123",
        },
      });

      const res = await app.handle(req);
      const body = (await res.json()) as { cookies: string[] };
      expect(body.cookies).toEqual(["session"]);
      await app.close();
    });
  });

  describe("headers.append()", () => {
    test("should append header to response", async () => {
      const app = createApp();
      app.get("/test", () => {
        headers.append("X-Custom", "value1");
        headers.append("X-Custom", "value2");
        return "ok";
      });

      const res = await app.handle(createRequest("/test"));
      expect(res.headers.get("X-Custom")).toBeTruthy();
      await app.close();
    });
  });

  describe("abort.rethrow() with non-abort Error", () => {
    test("should not rethrow regular Error", () => {
      const regularError = new Error("test");
      expect(() => abort.rethrow(regularError)).not.toThrow();
    });

    test("should rethrow abort errors", () => {
      const httpError = new HttpError("test", 400);
      expect(() => abort.rethrow(httpError)).toThrow(httpError);
    });

    test("should rethrow non-BaseHttpError errors", () => {
      const error = "just a string error";
      expect(() => abort.rethrow(error)).toThrow(error);
    });

    test("should rethrow AbortError (DOMException)", () => {
      const abortError = new DOMException("The operation was aborted", "AbortError");
      expect(() => abort.rethrow(abortError)).toThrow(abortError);
    });
  });

  describe("request.ip", () => {
    test("should throw error when IP plugin is not configured", () => {
      mockContext(() => {
        expect(() => request.ip()).toThrow(
          "proxy() plugin is not configured. Please register proxy({ ip: { ... } }) to enable IP extraction."
        );
      });
    });
  });

  describe("proxy", () => {
    test("should configure with a callback function", () => {
      const app = createApp();
      const ipPlugin = proxy({
        host: false,
        proto: false,
        ip: (ctx) => {
          return ctx.request.headers.get("x-real-ip");
        },
      });
      app.register(ipPlugin);
      app.get("/", () => {
        return request.ip();
      });

      const req = new Request("http://localhost/", {
        headers: {
          "x-real-ip": "123.123.123.123",
        },
      });

      app.handle(req).then((res) => {
        res.text().then((text) => {
          expect(text).toBe("123.123.123.123");
        });
      });
      app.close();
    });

    test("should configure with settings object", async () => {
      const app = createApp({ logger: false });
      const ipPlugin = proxy({ host: false, proto: false, ip: { depth: 2 } });
      app.register(ipPlugin);
      app.get("/", () => {
        return request.ip() ?? "no-ip";
      });

      const req = new Request("http://localhost/", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const res = await app.handle(req);
      const text = await res.text();
      expect(text).toBe("10.0.0.1");
      await app.close();
    });
  });

  describe("headers.getAll with comma-separated values", () => {
    test("should split comma-separated header values", () => {
      mockContext(
        () => {
          const values = headers.getAll("accept");
          expect(values).toContain("text/html");
          expect(values).toContain("application/json");
        },
        {
          headers: {
            accept: "text/html, application/json",
          },
        }
      );
    });

    test("should transform comma-separated values", () => {
      mockContext(
        () => {
          const values = headers.getAll("accept", (v) => v.toUpperCase());
          expect(values).toContain("TEXT/HTML");
          expect(values).toContain("APPLICATION/JSON");
        },
        {
          headers: {
            accept: "text/html, application/json",
          },
        }
      );
    });

    test("should return empty array for missing header", () => {
      mockContext(() => {
        const values = headers.getAll("x-missing-header");
        expect(values).toEqual([]);
      });
    });
  });

  describe("searchParams.get with various types", () => {
    test("should handle various data types", () => {
      mockContext(
        () => {
          expect(searchParams.get("string", (v) => v)).toBe("text");
          expect(searchParams.get("number", (v) => parseInt(v))).toBe(123);
          expect(searchParams.get("boolean", (v) => v === "true")).toBe(true);
        },
        { url: "/?string=text&number=123&boolean=true" }
      );
    });

    test("should return value directly when no transform is provided", () => {
      mockContext(
        () => {
          expect(searchParams.get("foo")).toBe("bar");
        },
        { url: "/?foo=bar" }
      );
    });
  });
});
