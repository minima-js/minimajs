import type { CookieSerializeOptions, UnsignResult } from "@fastify/cookie";

interface SignerMethods {
  signCookie(value: string): string;
  unsignCookie(value: string): UnsignResult;
}

export interface Request extends SignerMethods {
  cookies: { [cookieName: string]: string | undefined };
}

export interface Response {
  cookie(name: string, value: string, options?: CookieSerializeOptions): this;
  setCookie(name: string, value: string, options?: CookieSerializeOptions): this;
  clearCookie(name: string, options?: CookieSerializeOptions): this;
}
