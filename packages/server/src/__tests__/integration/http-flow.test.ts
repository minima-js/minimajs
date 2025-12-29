/**
 * Integration tests demonstrating complete HTTP request/response flows
 */
import { body, headers, response, searchParams, setHeader } from "../../http.js";
import { testRoute, expectStatus, expectHeader, expectBodyToMatch } from "../helpers/test-helpers.js";
import { testFixtures, createTestUser } from "../helpers/fixtures.js";

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

      expectStatus(res, 201);
      expectHeader(res, "x-user-created", "true");
      expectBodyToMatch(res, {
        user: {
          name: "John Doe",
          email: "john@example.com",
        },
      });
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
      expect((response.body as any).pagination).toEqual({
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

      expectHeader(response, "x-custom-1", "value1");
      expectHeader(response, "x-custom-2", "value2");
      expectHeader(response, "x-custom-3", "value3");
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

      expectStatus(res, 400);
      expect((res.body as any).error).toBe("Validation failed");
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

      expectStatus(res, 401);
      expectHeader(res, "www-authenticate", "Bearer");
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

      const payload = response.body as any;
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

      expectStatus(res, 201);
      expectHeader(res, "location", "/api/posts/123");
      const payload = res.body as any;
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
      expect(response.body).toEqual({ format: "json", data: [1, 2, 3] });
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

      const body = response.body as any;
      expect(body.receivedContentType).toBe("application/json");
      expect(body.receivedCustom).toBe("value");
    });
  });
});
