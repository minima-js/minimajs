import { describe, test, expect } from "@jest/globals";
import { mergeHeaders } from "./headers.js";

describe("mergeHeaders", () => {
  test("should merge headers into base Headers object", () => {
    const base = new Headers({ "Content-Type": "text/plain", "X-Original": "keep" });
    const override = new Headers({ "Content-Type": "application/json", "X-New": "added" });

    const result = mergeHeaders(base, override);

    expect(result).toBe(base); // Should return the same object
    expect(base.get("Content-Type")).toBe("application/json");
    expect(base.get("X-Original")).toBe("keep");
    expect(base.get("X-New")).toBe("added");
  });

  test("should merge multiple Headers objects", () => {
    const base = new Headers({ "Content-Type": "text/plain" });
    const first = new Headers({ "Content-Type": "application/json" });
    const second = new Headers({ "Content-Type": "text/html", "X-Custom": "value" });

    mergeHeaders(base, first, second);

    expect(base.get("Content-Type")).toBe("text/html"); // Last one wins
    expect(base.get("X-Custom")).toBe("value");
  });

  test("should handle empty Headers objects", () => {
    const base = new Headers({ "Content-Type": "text/plain" });
    const empty = new Headers();

    mergeHeaders(base, empty);

    expect(base.get("Content-Type")).toBe("text/plain");
  });

  test("should handle base with no initial headers", () => {
    const base = new Headers();
    const headers = new Headers({ "Content-Type": "application/json", "X-Custom": "value" });

    mergeHeaders(base, headers);

    expect(base.get("Content-Type")).toBe("application/json");
    expect(base.get("X-Custom")).toBe("value");
  });

  test("should override existing headers with new values", () => {
    const base = new Headers({ "Authorization": "Bearer token1" });
    const override = new Headers({ "Authorization": "Bearer token2" });

    mergeHeaders(base, override);

    expect(base.get("Authorization")).toBe("Bearer token2");
  });

  test("should preserve headers not in override", () => {
    const base = new Headers({
      "Content-Type": "text/plain",
      "X-Preserved": "keep-me",
      "X-Another": "also-keep",
    });
    const override = new Headers({ "Content-Type": "application/json" });

    mergeHeaders(base, override);

    expect(base.get("Content-Type")).toBe("application/json");
    expect(base.get("X-Preserved")).toBe("keep-me");
    expect(base.get("X-Another")).toBe("also-keep");
  });

  test("should handle case-insensitive header keys", () => {
    const base = new Headers({ "content-type": "text/plain" });
    const override = new Headers({ "Content-Type": "application/json" });

    mergeHeaders(base, override);

    // Headers API is case-insensitive, so both should work
    expect(base.get("content-type")).toBe("application/json");
    expect(base.get("Content-Type")).toBe("application/json");
  });

  test("should mutate base Headers object in place", () => {
    const base = new Headers({ "X-Original": "original" });
    const originalReference = base;

    mergeHeaders(base, new Headers({ "X-New": "new" }));

    expect(base).toBe(originalReference);
    expect(base.get("X-Original")).toBe("original");
    expect(base.get("X-New")).toBe("new");
  });

  test("should handle multiple values for same header", () => {
    const base = new Headers();
    const headers1 = new Headers({ "Set-Cookie": "session=abc" });
    const headers2 = new Headers({ "Set-Cookie": "token=xyz" });

    mergeHeaders(base, headers1, headers2);

    // Last one wins when using set()
    expect(base.get("Set-Cookie")).toBe("token=xyz");
  });

  test("should merge headers with special characters", () => {
    const base = new Headers();
    const headers = new Headers({
      "X-Custom-Header": "value with spaces",
      "X-Another": "value:with:colons",
      "X-With-Special": "value@with#special$chars",
    });

    mergeHeaders(base, headers);

    expect(base.get("X-Custom-Header")).toBe("value with spaces");
    expect(base.get("X-Another")).toBe("value:with:colons");
    expect(base.get("X-With-Special")).toBe("value@with#special$chars");
  });
});
