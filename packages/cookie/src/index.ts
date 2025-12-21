import type { CookieSerializeOptions } from "@fastify/cookie";
import fastifyCookie, { type FastifyCookieOptions } from "@fastify/cookie";
import { ValidationError } from "@minimajs/server/error";
import { getRequest, getResponse } from "./context.js";
const { assign } = Object;

export interface GetCookieOption {
  required?: boolean;
  signed?: boolean;
}

/**
 * Get all cookies as a record with optional type parameter
 * @returns Record of all cookies
 */
export function cookies<T = Record<string, string>>(): T {
  const req = getRequest();
  return req.cookies as unknown as T;
}

export namespace cookies {
  /**
   * Get a specific cookie by name
   * @param name - The cookie name
   * @param options - Optional configuration for required and signed cookies
   * @returns The cookie value, or undefined if not found (unless required is true)
   */
  export function get<T extends GetCookieOption>(
    name: string,
    options?: T
  ): T extends { required: true } ? string : string | undefined;
  export function get(name: string, { required, signed }: GetCookieOption = {}) {
    const { cookies: cookieMap, unsignCookie } = getRequest();
    if (!(name in cookieMap)) {
      if (!required) return;
      throw assign(new ValidationError(`Cookie \`${name}\` is required`), {
        code: "COOKIE_NOT_FOUND",
      });
    }
    const cookie = cookieMap[name]!;
    if (!signed) return cookie;
    const unsigned = unsignCookie(cookie);
    if (!unsigned.valid) {
      if (!required) return;
      throw assign(new ValidationError(`Cookie \`${name}\` is not valid`), {
        code: "COOKIE_NOT_VALID",
      });
    }
    return unsigned.value!;
  }

  /**
   * Set a cookie
   * @param name - The cookie name
   * @param value - The cookie value
   * @param options - Optional cookie serialization options
   */
  export function set(name: string, value: string, options?: CookieSerializeOptions) {
    const reply = getResponse();
    reply.setCookie(name, value, options);
  }

  /**
   * Delete a cookie
   * @param name - The cookie name
   * @param options - Optional cookie serialization options
   */
  export function remove(name: string, options?: CookieSerializeOptions) {
    getResponse().clearCookie(name, options);
  }
}

export { type CookieSerializeOptions };
export { fastifyCookie as plugin };
export { type FastifyCookieOptions as CookieOptions };
