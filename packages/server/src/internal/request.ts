import type { Context } from "../interfaces/context.js";
import type { request } from "../http.js";
/**
 * Extracts IP address from context based on settings
 * @internal
 */
export function extractIpAddress<S>(ctx: Context<S>, settings: request.ip.Settings): string | null {
  const { trustProxy = false, header, proxyDepth = 1 } = settings;
  if (header) {
    const customIp = ctx.request.headers.get(header);
    if (customIp) return customIp;
  }

  // Try standard proxy headers if trustProxy is enabled
  if (trustProxy) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    const forwardedFor = ctx.request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const ips = forwardedFor.split(",").map((ip) => ip.trim());
      // Get IP based on proxy depth (from right to left)
      const index = Math.max(0, ips.length - proxyDepth);
      return ips[index] || ips[0] || null;
    }

    // Try X-Real-IP header
    const realIp = ctx.request.headers.get("x-real-ip");
    if (realIp) return realIp;

    // Try Cloudflare header
    const cfIp = ctx.request.headers.get("cf-connecting-ip");
    if (cfIp) return cfIp;
  }

  // Fallback to socket address (Node.js specific)
  if (ctx.incomingMessage) {
    const socket = ctx.incomingMessage.socket;
    const socketIp = socket?.remoteAddress;
    if (socketIp) return socketIp;
  }

  return null;
}
