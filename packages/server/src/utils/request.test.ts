import { describe, test, expect } from "@jest/globals";
import { parseRequestURL } from "./request.js";

describe("parseRequestURL", () => {
  test("should parse HTTP and HTTPS URLs", () => {
    const local = new Request("http://localhost");
    const home = new Request("http://example.com");
    const http = new Request("http://example.com/users");
    const https = new Request("https://example.com/users");
    expect(parseRequestURL(local).pathStart).toBe(16);
    expect(parseRequestURL(home).pathStart).toBe(18);
    expect(parseRequestURL(http).pathStart).toBe(18);
    expect(parseRequestURL(https).pathStart).toBe(19);
  });

  test("should identify path boundaries with query string", () => {
    const request = new Request("http://example.com/users?page=1&limit=10");
    const result = parseRequestURL(request);

    expect(result.pathStart).toBe(18);
    expect(result.pathEnd).toBe(24); // stops at '?'
  });

  test("should identify path boundaries without query string", () => {
    const request = new Request("http://example.com/api/v1/users");
    const result = parseRequestURL(request);

    expect(result.pathStart).toBe(18);
    expect(result.pathEnd).toBe(31); // entire path
  });

  test("should extract pathname from URL", () => {
    const request = new Request("http://example.com/api/users?id=123");
    const { pathStart, pathEnd } = parseRequestURL(request);
    const pathname = request.url.slice(pathStart, pathEnd);

    expect(pathname).toBe("/api/users");
  });

  test("should extract query string from URL", () => {
    const request = new Request("http://example.com/users?page=1&limit=10");
    const { pathEnd } = parseRequestURL(request);
    const queryString = request.url.slice(pathEnd);

    expect(queryString).toBe("?page=1&limit=10");
  });

  test("should extract pathname with query string", () => {
    const request = new Request("http://example.com/search?q=test");
    const { pathStart } = parseRequestURL(request);
    const pathnameWithQuery = request.url.slice(pathStart);

    expect(pathnameWithQuery).toBe("/search?q=test");
  });

  test("should handle URLs with port and subdomain", () => {
    const request = new Request("https://api.example.com:8080/health");
    const { pathStart, pathEnd } = parseRequestURL(request);

    expect(request.url.slice(pathStart, pathEnd)).toBe("/health");
  });
});
