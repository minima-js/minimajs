import { describe, test, expect } from "@jest/globals";
import { cookies } from "./index.js";
import { mockContext } from "@minimajs/server/mock";

describe("Cookie", () => {
  test("should get all cookies", () => {
    mockContext(
      () => {
        const allCookies = cookies();
        expect(allCookies).toEqual({ theme: "dark", session: "abc123" });
      },
      { headers: { cookie: "theme=dark; session=abc123" } }
    );
  });

  test("should get a single cookie", () => {
    mockContext(
      () => {
        expect(cookies.get("theme")).toBe("dark");
        expect(cookies.get("session")).toBe("abc123");
      },
      { headers: { cookie: "theme=dark; session=abc123" } }
    );
  });

  test("should return undefined for non-existent cookie", () => {
    mockContext(() => {
      expect(cookies.get("nonexistent")).toBeUndefined();
    });
  });

  test("should set a cookie", () => {
    mockContext(() => {
      cookies.set("theme", "dark");
      // Cookie should be immediately accessible
      expect(cookies.get("theme")).toBe("dark");
    });
  });

  test("should set multiple cookies", () => {
    mockContext(() => {
      cookies.set("theme", "dark");
      cookies.set("lang", "en");

      expect(cookies.get("theme")).toBe("dark");
      expect(cookies.get("lang")).toBe("en");
    });
  });

  test("should remove a cookie", () => {
    mockContext(
      () => {
        cookies.remove("theme");
        // Cookie should be removed from memory
        expect(cookies.get("theme")).toBeUndefined();
        expect(cookies.get("session")).toBe("abc123");
      },
      { headers: { cookie: "theme=dark; session=abc123" } }
    );
  });

  test("should support type-safe cookies", () => {
    interface MyCookies {
      theme?: "light" | "dark";
      userId?: string;
    }

    mockContext(
      () => {
        const typedCookies = cookies<MyCookies>();
        // TypeScript should enforce the type
        expect(typedCookies.theme).toBe("dark");
        expect(typedCookies.userId).toBe("123");
      },
      { headers: { cookie: "theme=dark; userId=123" } }
    );
  });
});
