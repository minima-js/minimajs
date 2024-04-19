import type { CookieSerializeOptions } from "@fastify/cookie";
import fastifyCookie from "@fastify/cookie";
import { getRequest, getResponse } from "./context.js";

export { type CookieSerializeOptions };

export { fastifyCookie as cookiesPlugin };

export function getCookie(name: string): string | null {
  const req = getRequest();
  const cookie = req.cookies[name];
  if (!cookie) return null;
  return cookie;
}

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
