import { getContext } from "@minimajs/server/context";
import type { CookieSerializeOptions } from "@fastify/cookie";
import fastifyCookie from "@fastify/cookie";

export { fastifyCookie as cookiePlugin };
export { type CookieSerializeOptions };

export function getCookie(name: string, def?: string | null) {
  const cookies = getCookies();
  return cookies[name] ?? def;
}

export function getCookies() {
  const { req }: any = getContext();
  return req.cookies;
}

export function setCookie(
  name: string,
  value: string,
  options?: CookieSerializeOptions
) {
  const { reply }: any = getContext();
  reply.setCookie(name, value, options);
}
