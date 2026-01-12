import { hook, type Context } from "../index.js";
import { kIpAddr } from "../symbols.js";
import { isCallable } from "../utils/callable.js";

/**
 * Extracts IP address from context based on settings
 * @internal
 */
function extractIpAddress<S>(settings: IpSettings): IpCallback<S> {
  return function ({ request, incomingMessage }) {
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
  };
}

/**
 * Configures IP address extraction from requests.
 * Returns a hook that extracts and stores the client IP address.
 *
 * @param options - Configuration options for IP extraction, or a callback function for custom extraction
 * @returns A request hook that populates the IP address in locals
 *
 * @example
 * ```ts
 * // Basic usage - trust proxy headers
 * app.register(request.ip.configure({ trustProxy: true }));
 *
 * // Custom header
 * app.register(request.ip.configure({
 *   trustProxy: true,
 *   header: 'CF-Connecting-IP' // Cloudflare
 * }));
 *
 * // Multiple proxies
 * app.register(request.ip.configure({
 *   trustProxy: true,
 *   proxyDepth: 2 // trust 2 proxy hops
 * }));
 *
 * // Custom callback with full context access
 * app.register(request.ip.configure((ctx) => {
 *   // Custom logic to extract IP
 *   const customHeader = ctx.request.headers.get('x-custom-ip');
 *   if (customHeader) return customHeader;
 *
 *   // Access socket directly
 *   if (ctx.incomingMessage) {
 *     return ctx.incomingMessage.socket.remoteAddress || null;
 *   }
 *   return null;
 * }));
 * ```
 */

/**
 * Configuration options for IP address extraction
 */
export interface IpSettings {
  /**
   * Trust proxy headers (X-Forwarded-For, X-Real-IP, etc.)
   * Default: false
   */
  trustProxy?: boolean;

  /**
   * Custom header to read IP from
   * Default: tries X-Forwarded-For, X-Real-IP, then falls back to socket address
   */
  header?: string;

  /**
   * Number of proxy hops to trust when using X-Forwarded-For
   * Default: 1 (trust the last proxy)
   */
  proxyDepth?: number;
}

/**
 * Callback function type for custom IP extraction
 */
export type IpCallback<S = unknown> = (ctx: Context<S>) => string | null;

export type ProxyResolve = { header?: string } | ((ctx: Context) => string);

export interface ProxyOptions {
  ip: IpSettings | IpCallback;
  proto: ProxyResolve;
  host: ProxyResolve;
}

export function proxy(options: ProxyOptions) {
  let getIpAddress: IpCallback;
  if (options.ip) {
    getIpAddress = isCallable(options.ip) ? options.ip : extractIpAddress(options.ip);
  }

  function process(ctx: Context) {
    if (getIpAddress) {
      ctx.locals[kIpAddr] = getIpAddress(ctx);
    }
  }

  return hook("request", process);
}
