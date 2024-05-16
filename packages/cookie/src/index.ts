import type { CookieSerializeOptions } from "@fastify/cookie";
import fastifyCookie, { type FastifyCookieOptions } from "@fastify/cookie";
import { ValidationError } from "@minimajs/server/error";
import { getRequest, getResponse } from "./context.js";
const { assign } = Object;

export interface GetCookieOption {
  required?: boolean;
  signed?: boolean;
}

export { getCookie };
function getCookie<T extends GetCookieOption>(
  name: string,
  options?: T
): T extends { required: true } ? string : string | undefined;
function getCookie(name: string, { required, signed }: GetCookieOption = {}) {
  const { cookies, unsignCookie } = getRequest();
  if (!(name in cookies)) {
    if (!required) return;
    throw assign(new ValidationError(`Cookie \`${name}\` is required`), {
      code: "COOKIE_NOT_FOUND",
    });
  }
  const cookie = cookies[name]!;
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

export function getCookies() {
  const req = getRequest();
  return req.cookies as unknown as Record<string, string>;
}

export function setCookie(name: string, value: string, options?: CookieSerializeOptions) {
  const reply = getResponse();
  return reply.setCookie(name, value, options);
}

export function deleteCookie(name: string, options?: CookieSerializeOptions) {
  return getResponse().clearCookie(name, options);
}

export { type CookieSerializeOptions };
export { fastifyCookie as plugin };
export { type FastifyCookieOptions as CookieOptions };
