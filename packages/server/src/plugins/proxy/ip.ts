import type { Context } from "../../index.js";
import type { IpSettings, IpCallback } from "./types.js";

export function extractIpAddress<S>(settings: IpSettings, shouldTrust: (ctx: Context<S>) => boolean): IpCallback<S> {
  return function (ctx) {
    const { request, incomingMessage } = ctx;
    const { header, proxyDepth = 1 } = settings;

    if (header) {
      const customIp = request.headers.get(header);
      if (customIp) return customIp;
    }

    if (shouldTrust(ctx)) {
      const forwardedFor = request.headers.get("x-forwarded-for");
      if (forwardedFor) {
        const ips = forwardedFor.split(",").map((ip) => ip.trim());
        const index = Math.max(0, ips.length - proxyDepth);
        return ips[index] || ips[0] || null;
      }

      const realIp = request.headers.get("x-real-ip");
      if (realIp) return realIp;
    }

    if (incomingMessage && incomingMessage.socket) {
      return incomingMessage.socket.remoteAddress || null;
    }

    return null;
  };
}
