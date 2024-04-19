import type { CookieSerializeOptions } from "@fastify/cookie";
import fastifyCookie from "@fastify/cookie";
import { getRequest, getResponse } from "./context.js";
import { createAttribute } from "@minimajs/server/utils";
import { ValidationError } from "@minimajs/server/error";

export { type CookieSerializeOptions };

export { fastifyCookie as cookiesPlugin };
function throwAttributeError(accessor: string, name: string, message: string): never {
  throw new ValidationError(accessor + "`" + name + "` " + message);
}

export const getCookie = createAttribute(getCookies, throwAttributeError.bind(this, "Cookie "), false);

export function getSignedCookie(name: string) {
  const req = getRequest();
  const cookie = req.cookies[name];
  if (!cookie) return null;
  return req.unsignCookie(cookie);
}

export function getCookies(): Record<string, string | undefined> {
  const req = getRequest();
  return req.cookies;
}

export function setCookie(name: string, value: string, options?: CookieSerializeOptions) {
  const reply = getResponse();
  return reply.setCookie(name, value, options);
}

export function deleteCookie(name: string) {
  return getResponse().clearCookie(name);
}
