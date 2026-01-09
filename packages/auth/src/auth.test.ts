import { describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { createAuth } from "./auth.js";
import { HttpError } from "@minimajs/server/error";
import { type App } from "@minimajs/server";
import { createApp } from "@minimajs/server/bun";
import { createRequest } from "@minimajs/server/mock";

// Mock user type for testing
interface User {
  id: number;
  name: string;
  isAdmin: boolean;
}

describe("createAuth", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => {
    return app.close();
  });

  describe("Optional authentication (without required option)", () => {
    test("should return user data when authentication succeeds", async () => {
      const mockUser: User = { id: 1, name: "John Doe", isAdmin: false };
      const [plugin, getUser] = createAuth(async () => mockUser);
      app.register(plugin);
      app.get("/", () => getUser() ?? "No User");
      const res = await app.handle(createRequest("/"));
      expect(await res.json()).toEqual(mockUser);
    });

    test("should return undefined when authentication callback throws BaseHttpError", async () => {
      const authError = new HttpError("Unauthorized", 401);
      const [plugin, getUser] = createAuth(async () => {
        throw authError;
      });
      app.register(plugin);

      app.get("/", () => {
        const user = getUser();
        return user ?? "No User";
      });

      const res = await app.handle(createRequest("/"));
      expect(await res.text()).toBe("No User");
    });

    test("should throw non-BaseHttpError errors", async () => {
      const genericError = new Error("Database connection failed");
      const [plugin, getUser] = createAuth(async () => {
        throw genericError;
      });
      app.register(plugin);

      app.get("/", () => getUser());

      const res = await app.handle(createRequest("/"));
      expect(res.status).toBe(500);
    });

    test("should allow accessing user with optional chaining", async () => {
      const mockUser: User = { id: 1, name: "Jane Doe", isAdmin: true };
      const [plugin, getUser] = createAuth(() => mockUser);
      app.register(plugin);

      app.get("/", () => {
        const userName = getUser()?.name;
        const isAdmin = getUser()?.isAdmin;
        return { userName, isAdmin };
      });

      const res = await app.handle(createRequest("/"));
      expect(await res.text()).toBe(JSON.stringify({ userName: "Jane Doe", isAdmin: true }));
    });

    test("required() method should return user data when auth succeeds", async () => {
      const mockUser: User = { id: 2, name: "Alice", isAdmin: false };
      const [plugin, getUser] = createAuth(async () => mockUser);
      app.register(plugin);

      app.get("/", () => {
        const user = getUser.required();
        return user;
      });

      const res = await app.handle(createRequest("/"));
      expect(await res.text()).toBe(JSON.stringify(mockUser));
    });

    test("required() method should throw when authentication fails", async () => {
      const authError = new HttpError("Invalid token", 401);
      const [plugin, getUser] = createAuth(async () => {
        throw authError;
      });
      app.register(plugin);

      app.get("/", () => {
        return getUser.required();
      });

      const res = await app.handle(createRequest("/"));
      expect(res.status).toBe(401);
      expect(await res.text()).toBe(JSON.stringify({ message: "Invalid token" }));
    });

    test("should support synchronous callbacks", async () => {
      const mockUser: User = { id: 3, name: "Bob", isAdmin: true };
      const [plugin, getUser] = createAuth(() => mockUser);
      app.register(plugin);

      app.get("/", () => getUser());

      const res = await app.handle(createRequest("/"));
      expect(await res.text()).toBe(JSON.stringify(mockUser));
    });
  });

  describe("Required authentication (with required: true option)", () => {
    test("should return user data when authentication succeeds", async () => {
      const mockUser: User = { id: 1, name: "John Doe", isAdmin: false };
      const [plugin, getUser] = createAuth(async () => mockUser, {
        required: true,
      });
      app.register(plugin);

      app.get("/", () => getUser());

      const res = await app.handle(createRequest("/"));
      expect(await res.text()).toBe(JSON.stringify(mockUser));
    });

    test("should throw error immediately when authentication fails", async () => {
      const authError = new HttpError("Unauthorized", 401);
      const [plugin, getUser] = createAuth(
        async () => {
          throw authError;
        },
        { required: true }
      );
      app.register(plugin);

      app.get("/", () => getUser());

      const res = await app.handle(createRequest("/"));
      expect(res.status).toBe(401);
      expect(await res.text()).toBe(JSON.stringify({ message: "Unauthorized" }));
    });

    test("should throw non-BaseHttpError errors", async () => {
      const genericError = new Error("Service unavailable");
      const [plugin, getUser] = createAuth(
        async () => {
          throw genericError;
        },
        { required: true }
      );
      app.register(plugin);

      app.get("/", () => getUser());

      const res = await app.handle(createRequest("/"));
      expect(res.status).toBe(500);
    });

    test("required() method should work the same as regular call", async () => {
      const mockUser: User = { id: 4, name: "Charlie", isAdmin: true };
      const [plugin, getUser] = createAuth(async () => mockUser, {
        required: true,
      });
      app.register(plugin);

      app.get("/", () => {
        const user1 = getUser();
        const user2 = getUser.required();
        return { user1, user2 };
      });

      const res = await app.handle(createRequest("/"));
      const body = (await res.json()) as any;
      expect(body.user1).toEqual(mockUser);
      expect(body.user2).toEqual(mockUser);
    });

    test("should return non-nullable user type", async () => {
      const mockUser: User = { id: 5, name: "Diana", isAdmin: false };
      const [plugin, getUser] = createAuth(async () => mockUser, {
        required: true,
      });
      app.register(plugin);

      app.get("/", () => {
        const user = getUser();
        // TypeScript should know user is not undefined
        return { name: user.name, id: user.id };
      });

      const res = await app.handle(createRequest("/"));
      expect(await res.text()).toBe(JSON.stringify({ name: "Diana", id: 5 }));
    });
  });

  describe("Context isolation", () => {
    test("should isolate auth data between different requests", async () => {
      const [plugin, getUser] = createAuth(async () => ({
        id: 1,
        name: "User 1",
        isAdmin: false,
      }));
      app.register(plugin);

      app.get("/", () => getUser());

      const res1 = await app.handle(createRequest("/"));
      expect(((await res1.json()) as any).name).toBe("User 1");

      const res2 = await app.handle(createRequest("/"));
      expect(((await res2.json()) as any).name).toBe("User 1");
    });

    test("should not leak auth data between requests", async () => {
      let counter = 0;
      const [plugin, getUser] = createAuth(async () => {
        counter++;
        return { id: counter, name: `User ${counter}`, isAdmin: false };
      });
      app.register(plugin);

      app.get("/", () => getUser());

      const res1 = await app.handle(createRequest("/"));
      const body1 = (await res1.json()) as any;
      expect(body1.id).toBe(1);

      const res2 = await app.handle(createRequest("/"));
      const body2 = (await res2.json()) as any;
      expect(body2.id).toBe(2);
    });
  });

  describe("Error handling", () => {
    test("should handle BaseHttpError with custom status code", async () => {
      const forbiddenError = new HttpError("Forbidden", 403);
      const [plugin, getUser] = createAuth(async () => {
        throw forbiddenError;
      });
      app.register(plugin);

      app.get("/", () => getUser.required());

      const res = await app.handle(createRequest("/"));
      expect(res.status).toBe(403);
      expect(await res.text()).toBe(JSON.stringify({ message: "Forbidden" }));
    });

    test("should preserve error message and status", async () => {
      const customError = new HttpError("Custom auth error", 418);
      const [plugin, getUser] = createAuth(async () => {
        throw customError;
      });
      app.register(plugin);

      app.get("/", () => getUser.required());

      const res = await app.handle(createRequest("/"));
      expect(res.status).toBe(418);
      expect(await res.text()).toBe(JSON.stringify({ message: "Custom auth error" }));
    });
  });

  describe("Edge cases", () => {
    test("should handle complex user objects", async () => {
      const complexUser = {
        id: 1,
        name: "Complex User",
        isAdmin: true,
        roles: ["admin", "user", "moderator"],
        metadata: {
          createdAt: "2024-01-01",
          lastLogin: "2024-12-23",
        },
      };

      const [plugin, getUser] = createAuth(async () => complexUser);
      app.register(plugin);

      app.get("/", () => {
        const user = getUser();
        return {
          user,
          rolesLength: user?.roles.length,
        };
      });

      const res = await app.handle(createRequest("/"));
      const body = (await res.json()) as any;
      expect(body.user).toEqual(complexUser);
      expect(body.rolesLength).toBe(3);
    });
  });
});
