import { getContext } from "@minimajs/app/context";
import type { CookieSerializeOptions } from "@fastify/cookie";
import fastifyCookie from "@fastify/cookie";

export { fastifyCookie as cookiePlugin };

export function getCookie(name: string, def?: string | null) {
  const req: any = getContext().req;
  const cookies = req.cookies;
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
