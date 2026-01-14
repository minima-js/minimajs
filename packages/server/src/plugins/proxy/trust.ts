import type { Context } from "../../interfaces/index.js";
import type { ProxyOptions } from "./types.js";

export function createTrustValidator<S>(trustProxies: ProxyOptions<S>["trustProxies"]): (ctx: Context<S>) => boolean {
  if (typeof trustProxies === "function") {
    return trustProxies;
  }

  if (typeof trustProxies === "boolean") {
    return () => trustProxies;
  }

  const trustProxiesSet = new Set(trustProxies);

  return (ctx: Context<S>) => {
    const ip = ctx.serverAdapter.remoteAddr(ctx);
    return ip ? trustProxiesSet.has(ip) : false;
  };
}
