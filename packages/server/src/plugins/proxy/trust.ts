import { isCallable } from "../../utils/callable.js";
import type { TrustProxyFn } from "./types.js";

export function createTrustValidator<S>(trustProxies?: boolean | string[] | TrustProxyFn<S>): TrustProxyFn<S> {
  if (!trustProxies) {
    return () => false;
  }

  if (trustProxies === true) {
    return () => true;
  }

  if (isCallable(trustProxies)) {
    return trustProxies;
  }

  const trustedIps = new Set(trustProxies);
  return (ctx) => {
    const remoteIp = ctx.incomingMessage?.socket?.remoteAddress;
    return remoteIp ? trustedIps.has(remoteIp) : false;
  };
}
