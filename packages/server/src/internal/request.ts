import type { Context } from "../interfaces/context.js";
import type { request } from "../http.js";
/**
 * Extracts IP address from context based on settings
 * @internal
 */
export function extractIpAddress<S>({ request, incomingMessage }: Context<S>, settings: request.ip.Settings): string | null {
  const { trustProxy = false, header, proxyDepth = 1 } = settings;
  if (header) {
    const customIp = request.headers.get(header);
    if (customIp) return customIp;
  }

  // Try standard proxy headers if trustProxy is enabled
  if (trustProxy) {
    // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const ips = forwardedFor.split(",").map((ip) => ip.trim());
      // Get IP based on proxy depth (from right to left)
      const index = Math.max(0, ips.length - proxyDepth);
      return ips[index] || ips[0] || null;
    }

    // Try X-Real-IP header
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
  }
  // Fallback to socket address (Node.js specific)
  if (incomingMessage && incomingMessage.socket) {
    return incomingMessage.socket.remoteAddress || null;
  }

  return null;
}
