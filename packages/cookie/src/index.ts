/**
 * @minimajs/cookie - Type-safe cookie management
 * @module @minimajs/cookie
 *
 * @example
 * ```typescript
 * import { cookies } from "@minimajs/cookie";
 *
 * // Get all cookies
 * const allCookies = cookies();
 *
 * // Get a specific cookie
 * const theme = cookies.get("theme");
 *
 * // Set a cookie
 * cookies.set("theme", "dark", { httpOnly: true });
 *
 * // Remove a cookie
 * cookies.remove("theme");
 * ```
 */
import cookie, { type SerializeOptions } from "cookie";
import { createContext, defer, headers } from "@minimajs/server";

/**
 * Internal cookie storage structure for request scope
 * @internal
 */
interface CookieStore {
  /** Parsed incoming cookies from the Cookie header */
  incoming: Record<string, string>;
  /** Outgoing Set-Cookie header values to be sent in response */
  outgoing: string[];
}

/**
 * Request-scoped cookie store
 * Lazily initialized on first access within each request
 * @internal
 */
const [getCookieStore] = createContext<CookieStore>(() => {
  // Parse incoming cookies from request header
  const cookieHeader = headers.get("cookie") ?? "";
  const parsedCookies = cookie.parse(cookieHeader);

  const store: CookieStore = {
    incoming: parsedCookies as Record<string, string>,
    outgoing: [],
  };

  // Register deferred callback to write Set-Cookie headers
  defer(() => {
    if (store.outgoing.length > 0) {
      for (const cookieString of store.outgoing) {
        headers.append("Set-Cookie", cookieString);
      }
    }
  });

  return store;
});

/**
 * Retrieves all cookies from the current request as a typed record.
 *
 * @template T - Type definition for the cookie object (defaults to `Record<string, string>`)
 * @returns All cookies as a typed record
 *
 * @example
 * ```typescript
 * // Get all cookies (untyped)
 * const allCookies = cookies();
 * // Type: Record<string, string>
 *
 * // Get all cookies with type safety
 * interface UserCookies {
 *   sessionId?: string;
 *   theme?: "light" | "dark";
 * }
 * const userCookies = cookies<UserCookies>();
 * // Type: UserCookies
 * ```
 *
 * @since 1.0.0
 */
export function cookies<T = Record<string, string>>(): T {
  return getCookieStore().incoming as T;
}

/**
 * Cookie management utilities
 * @namespace
 */
export namespace cookies {
  /**
   * Retrieves a single cookie value by name.
   *
   * @param name - The cookie name
   * @returns The cookie value, or `undefined` if not found
   *
   * @example
   * ```typescript
   * const theme = cookies.get("theme");
   * // theme is string | undefined
   *
   * const userId = cookies.get("user-id");
   * if (!userId) {
   *   throw new Error("Not authenticated");
   * }
   * ```
   *
   * @since 1.0.0
   */
  export function get(name: string): string | undefined {
    return getCookieStore().incoming[name];
  }

  /**
   * Sets a cookie to be sent in the response.
   * The cookie value is immediately available for reading within the same request.
   *
   * @param name - The cookie name
   * @param value - The cookie value
   * @param options - Cookie serialization options (path, domain, maxAge, etc.)
   *
   * @example
   * ```typescript
   * // Simple cookie
   * cookies.set("theme", "dark");
   *
   * // Secure session cookie
   * cookies.set("sessionId", "abc123", {
   *   httpOnly: true,
   *   secure: true,
   *   maxAge: 3600, // 1 hour in seconds
   *   sameSite: "strict",
   * });
   *
   * // Cookie with custom path
   * cookies.set("adminToken", "xyz789", {
   *   path: "/admin",
   *   httpOnly: true,
   * });
   * ```
   *
   * @see {@link https://github.com/jshttp/cookie#options-1|Cookie serialize options}
   * @since 1.0.0
   */
  export function set(name: string, value: string, options?: SerializeOptions): void {
    const store = getCookieStore();
    const serialized = cookie.serialize(name, value, options);

    store.outgoing.push(serialized);
    // Update incoming cookies for immediate read access within the same request
    store.incoming[name] = value;
  }

  /**
   * Removes a cookie by setting its expiration to the past.
   * The cookie is immediately removed from the incoming cookies for the current request.
   *
   * @param name - The cookie name to remove
   * @param options - Cookie options (must match the path/domain of the original cookie)
   *
   * @example
   * ```typescript
   * // Remove a cookie
   * cookies.remove("sessionId");
   *
   * // Remove a cookie with specific path/domain
   * cookies.remove("adminToken", {
   *   path: "/admin",
   *   domain: "example.com",
   * });
   * ```
   *
   * @remarks
   * To successfully remove a cookie, the `path` and `domain` options must match
   * those used when the cookie was originally set. Browsers will only delete
   * cookies that match all attributes.
   *
   * @since 1.0.0
   */
  export function remove(name: string, options?: SerializeOptions): void {
    const store = getCookieStore();
    const serialized = cookie.serialize(name, "", {
      ...options,
      expires: new Date(0),
      maxAge: 0,
    });

    store.outgoing.push(serialized);
    // Remove from incoming cookies immediately
    delete store.incoming[name];
  }
}
