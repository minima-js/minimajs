/**
 * Integration tests demonstrating complete HTTP request/response flows
 */
import { body, headers, params, response, searchParams } from "../../http.js";
import { testRoute } from "../helpers/test-helpers.js";
import { testFixtures, createTestUser } from "../helpers/fixtures.js";
const setHeader = headers.set;

describe("HTTP Integration Tests", () => {
  describe("Complete request lifecycle", () => {
    test("should handle POST request with body and headers", async () => {
      const res = await testRoute(
        () => {
          const user = body<{ name: string; email: string }>();
          const authToken = headers.get("authorization");

          expect(authToken).toBe("Bearer token123");
          expect(user?.name).toBe("John Doe");

          response.status(201);
          setHeader("x-user-created", "true");

          return { user };
        },
        {
          method: "POST",
          body: createTestUser(),
          headers: testFixtures.headers.auth,
        }
      );
      expect(res.status).toBe(201);
      expect(res.headers.get("x-user-created")).toBe("true");
      const b: any = await res.json();
      expect(b.user.name).toBe("John Doe");
      expect(b.user.email).toBe("john@example.com");
    });

    test("should handle query parameters", async () => {
      const response = await testRoute(
        () => {
          const page = searchParams.get("page");
          const limit = searchParams.get("limit");

          expect(page).toBe("1");
          expect(limit).toBe("10");

          return {
            pagination: {
              page: parseInt(page || "1"),
              limit: parseInt(limit || "10"),
            },
          };
        },
        {
          query: { page: "1", limit: "10" },
        }
      );

      expect(response.status).toBe(200);
      expect(((await response.json()) as any).pagination).toEqual({
        page: 1,
        limit: 10,
      });
    });

    test("should handle multiple headers", async () => {
      const response = await testRoute(() => {
        setHeader("x-custom-1", "value1");
        setHeader("x-custom-2", "value2");
        headers.set("x-custom-3", "value3");

        return { message: "Headers set" };
      });

      expect(response.headers.get("x-custom-1")).toBe("value1");
      expect(response.headers.get("x-custom-2")).toBe("value2");
      expect(response.headers.get("x-custom-3")).toBe("value3");
    });
  });

  describe("Error handling flows", () => {
    test("should handle validation errors with proper status", async () => {
      const res = await testRoute(
        () => {
          const userData = body<{ email?: string }>();

          if (!userData?.email) {
            response.status(400);
            return {
              error: "Validation failed",
              message: "Email is required",
            };
          }

          return { success: true };
        },
        {
          method: "POST",
          body: {},
        }
      );

      expect(res.status).toBe(400);
      const b: any = await res.json();
      expect(b.error).toBe("Validation failed");
    });

    test("should handle unauthorized access", async () => {
      const res = await testRoute(() => {
        const authToken = headers.get("authorization");

        if (!authToken) {
          response.status(401);
          setHeader("www-authenticate", "Bearer");
          return { error: "Unauthorized" };
        }

        return { success: true };
      });

      expect(res.status).toBe(401);
      expect(res.headers.get("www-authenticate")).toBe("Bearer");
    });
  });

  describe("REST API patterns", () => {
    test("should handle GET request with filters", async () => {
      const response = await testRoute(
        () => {
          const statusFilter = searchParams.get("status");
          const category = searchParams.get("category");

          return {
            items: [
              { id: 1, status: statusFilter, category },
              { id: 2, status: statusFilter, category },
            ],
            total: 2,
          };
        },
        {
          query: { status: "active", category: "tech" },
        }
      );

      const payload = (await response.json()) as any;
      expect(payload.items).toHaveLength(2);
      expect(payload.items[0].status).toBe("active");
      expect(payload.items[0].category).toBe("tech");
    });

    test("should handle POST request creating resource", async () => {
      const res = await testRoute(
        () => {
          const data = body<{ title: string; content: string }>();

          response.status(201);
          setHeader("location", "/api/posts/123");

          return {
            id: "123",
            ...data,
            createdAt: new Date("2024-01-01").toISOString(),
          };
        },
        {
          method: "POST",
          body: {
            title: "New Post",
            content: "Post content",
          },
        }
      );

      expect(res.status).toBe(201);
      expect(res.headers.get("location")).toBe("/api/posts/123");
      const payload = (await res.json()) as any;
      expect(payload.id).toBe("123");
      expect(payload.title).toBe("New Post");
    });
  });

  describe("Content negotiation", () => {
    test("should handle JSON responses", async () => {
      const response = await testRoute(() => {
        return { format: "json", data: [1, 2, 3] };
      });

      expect(response.headers.get("content-type")).toContain("application/json");
      expect(await response.json()).toEqual({ format: "json", data: [1, 2, 3] });
    });

    test("should read request headers", async () => {
      const response = await testRoute(
        () => {
          const contentType = headers.get("content-type");
          const customHeader = headers.get("x-custom");

          return {
            receivedContentType: contentType,
            receivedCustom: customHeader,
          };
        },
        {
          headers: testFixtures.headers.combined,
        }
      );

      const b: any = await response.json();
      expect(b.receivedContentType).toBe("application/json");
      expect(b.receivedCustom).toBe("value");
    });
  });

  describe("Complex request scenarios", () => {
    test("should handle request with body, params, query, and headers", async () => {
      const res = await testRoute(
        () => {
          const userData = body<{ name: string; email: string }>();
          const userId = params.get("userId");
          const page = searchParams.get("page");
          const authToken = headers.get("authorization");

          response.status(200);
          setHeader("x-processed", "true");

          return {
            user: userData,
            userId,
            page,
            authenticated: !!authToken,
          };
        },
        {
          method: "POST",
          path: "/users/:userId",
          url: "/users/123?page=2",
          body: { name: "John", email: "john@example.com" },
          headers: { authorization: "Bearer token123" },
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("x-processed")).toBe("true");
      const payload = (await res.json()) as any;
      expect(payload.user.name).toBe("John");
      expect(payload.page).toBe("2");
      expect(payload.authenticated).toBe(true);
    });

    test("should handle nested route with multiple middleware-like operations", async () => {
      const executionOrder: string[] = [];
      const res = await testRoute(
        () => {
          executionOrder.push("handler-start");
          const authToken = headers.get("authorization");

          if (!authToken) {
            executionOrder.push("auth-check-failed");
            response.status(401);
            return { error: "Unauthorized" };
          }

          executionOrder.push("auth-check-passed");
          const data = body<{ action: string }>();
          executionOrder.push("body-parsed");

          if (!data?.action) {
            executionOrder.push("validation-failed");
            response.status(400);
            return { error: "Action required" };
          }

          executionOrder.push("validation-passed");
          response.status(200);
          setHeader("x-action", data.action);
          return { success: true, action: data.action };
        },
        {
          method: "POST",
          body: { action: "create" },
          headers: { authorization: "Bearer token123" },
        }
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("x-action")).toBe("create");
      expect(executionOrder).toEqual([
        "handler-start",
        "auth-check-passed",
        "body-parsed",
        "validation-passed",
      ]);
    });

    test("should handle error recovery and fallback responses", async () => {
      const res = await testRoute(
        () => {
          try {
            const data = body<{ value: number }>();
            if (data.value < 0) {
              throw new Error("Negative value not allowed");
            }
            return { result: data.value * 2 };
          } catch (error) {
            response.status(400);
            return { error: "Invalid input", message: (error as Error).message };
          }
        },
        {
          method: "POST",
          body: { value: -5 },
        }
      );

      expect(res.status).toBe(400);
      const payload = (await res.json()) as any;
      expect(payload.error).toBe("Invalid input");
    });

    test("should handle streaming-like response with multiple data chunks", async () => {
      const res = await testRoute(() => {
        response.status(200);
        setHeader("content-type", "application/json");
        return {
          items: Array.from({ length: 100 }, (_, i) => ({ id: i + 1, value: `item-${i + 1}` })),
          total: 100,
        };
      });

      expect(res.status).toBe(200);
      const payload = (await res.json()) as any;
      expect(payload.items).toHaveLength(100);
      expect(payload.total).toBe(100);
      expect(payload.items[0].id).toBe(1);
      expect(payload.items[99].id).toBe(100);
    });

    test("should handle conditional responses based on multiple factors", async () => {
      const res1 = await testRoute(
        () => {
          const userAgent = headers.get("user-agent");
          const accept = headers.get("accept");
          const format = searchParams.get("format");

          if (format === "xml" || accept?.includes("application/xml")) {
            response.status(200);
            setHeader("content-type", "application/xml");
            return "<response><status>ok</status></response>";
          }

          if (userAgent?.includes("Mobile")) {
            response.status(200);
            return { mobile: true, message: "Mobile response" };
          }

          response.status(200);
          return { desktop: true, message: "Desktop response" };
        },
        {
          headers: { "user-agent": "Mozilla/5.0 Mobile", accept: "application/json" },
          query: { format: "json" },
        }
      );

      const payload1 = (await res1.json()) as any;
      expect(payload1.mobile).toBe(true);

      const res2 = await testRoute(
        () => {
          const format = searchParams.get("format");
          if (format === "xml") {
            response.status(200);
            setHeader("content-type", "application/xml");
            return "<response><status>ok</status></response>";
          }
          return { format: "json" };
        },
        {
          query: { format: "xml" },
        }
      );

      expect(res2.headers.get("content-type")).toContain("application/xml");
    });
  });

  describe("Performance and edge cases", () => {
    test("should handle large request body", async () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: "x".repeat(100),
        })),
      };

      const res = await testRoute(
        () => {
          const data = body<typeof largeData>();
          return { received: data.items.length, first: data.items[0] };
        },
        {
          method: "POST",
          body: largeData,
        }
      );

      expect(res.status).toBe(200);
      const payload = (await res.json()) as any;
      expect(payload.received).toBe(1000);
      expect(payload.first.id).toBe(0);
    });

    test("should handle many query parameters", async () => {
      const queryParams: Record<string, string> = {};
      for (let i = 0; i < 50; i++) {
        queryParams[`param${i}`] = `value${i}`;
      }

      const res = await testRoute(
        () => {
          const p = searchParams<Record<string, string>>();
          return {
            count: Object.keys(p).length,
            first: searchParams.get("param0"),
            last: searchParams.get("param49"),
          };
        },
        {
          query: queryParams,
        }
      );

      expect(res.status).toBe(200);
      const payload = (await res.json()) as any;
      expect(payload.count).toBeGreaterThanOrEqual(50);
      expect(payload.first).toBe("value0");
      expect(payload.last).toBe("value49");
    });

    test("should handle special characters in all input types", async () => {
      const res = await testRoute(
        () => {
          const data = body<{ message: string }>();
          const id = params.get("id");
          const query = searchParams.get("q");
          const header = headers.get("x-custom");

          return {
            body: data.message,
            param: id,
            query,
            header,
          };
        },
        {
          method: "POST",
          url: "/test/%E2%98%BA?q=hello%20world",
          path: "/test/:id",
          body: { message: "Test with émojis 🎉 and spéciál chars" },
          query: { q: "hello world" },
          headers: { "x-custom": "value with spaces & symbols!" },
        }
      );

      expect(res.status).toBe(200);
      const payload: any = await res.json();
      expect(payload.body).toContain("émojis");
      expect(payload.header).toBe("value with spaces & symbols!");
    });
  });
});
