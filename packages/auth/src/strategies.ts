import { headers, searchParams } from "@minimajs/server";
import { UnauthorizedError } from "./error.js";
import type { AuthCallback } from "./auth.js";

/**
 * Extracts a Bearer token from the `Authorization` header and passes it to the callback.
 * Throws `UnauthorizedError` if the header is missing or not a Bearer token.
 */
export function bearer<T>(callback: (token: string) => T | Promise<T>): AuthCallback<T> {
  return async function bearerStrategy() {
    const header = headers.get("authorization");
    const token = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : undefined;
    if (!token) throw new UnauthorizedError();
    return callback(token);
  };
}

/**
 * Extracts a value from a custom request header and passes it to the callback.
 * Throws `UnauthorizedError` if the header is missing.
 *
 * Use `apiKey.query(param, cb)` to extract from a query string parameter instead.
 */
export function apiKey<T>(headerName: string, callback: (key: string) => T | Promise<T>): AuthCallback<T> {
  return async function apiKeyStrategy() {
    const key = headers.get(headerName);
    if (!key) throw new UnauthorizedError();
    return callback(key);
  };
}

export namespace apiKey {
  /** Extracts a value from a query string parameter and passes it to the callback.
   * Throws `UnauthorizedError` if the parameter is missing.
   */
  export function query<T>(paramName: string, callback: (key: string) => T | Promise<T>): AuthCallback<T> {
    return async function queryApiKeyStrategy() {
      const key = searchParams.get(paramName);
      if (!key) throw new UnauthorizedError();
      return callback(key);
    };
  }
}

/**
 * Reads user identity from individual gateway-forwarded headers.
 * Throws `UnauthorizedError` if any mapped header is missing.
 *
 * Use `fromHeaders.json(header)` when the gateway encodes the full payload as JSON in one header.
 *
 * @example
 * ```typescript
 * createAuth(fromHeaders({ id: "x-user-id", role: "x-user-role" }))
 * ```
 */
export function fromHeaders<T extends { [K in keyof T]: string }>(mapping: { [K in keyof T]: string }): AuthCallback<T> {
  return function headersStrategy() {
    const result = {} as Record<string, string>;
    for (const [key, header] of Object.entries(mapping)) {
      const value = headers.get(header as string);
      if (!value) throw new UnauthorizedError();
      result[key] = value;
    }
    return result as T;
  };
}

export namespace fromHeaders {
  /**
   * Reads a JSON-encoded user payload from a single header.
   * Throws `UnauthorizedError` if the header is missing.
   *
   * @example
   * ```typescript
   * createAuth(fromHeaders.json<User>("x-user"))
   * ```
   */
  export function json<T>(headerName: string): AuthCallback<T> {
    return function jsonHeaderStrategy() {
      const value = headers.get(headerName);
      if (!value) throw new UnauthorizedError();
      try {
        return JSON.parse(value) as T;
      } catch {
        throw new UnauthorizedError();
      }
    };
  }

  /**
   * Reads a custom-encoded user payload from a single header.
   * The `decode` function is required — use this for base64, msgpack, protobuf, etc.
   * Throws `UnauthorizedError` if the header is missing or decoding fails.
   *
   * @example
   * ```typescript
   * createAuth(fromHeaders.encoded<User>("x-user", val => JSON.parse(atob(val))))        // base64+JSON
   * createAuth(fromHeaders.encoded<User>("x-user", val => msgpack.decode(atob(val))))    // msgpack
   * ```
   */
  export function encoded<T>(headerName: string, decode: (val: string) => T): AuthCallback<T> {
    return function encodedHeaderStrategy() {
      const value = headers.get(headerName);
      if (!value) throw new UnauthorizedError();
      try {
        return decode(value);
      } catch {
        throw new UnauthorizedError();
      }
    };
  }
}
