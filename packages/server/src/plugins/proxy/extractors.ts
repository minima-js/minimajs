import { type Context } from "../../index.js";
import { isCallable } from "../../utils/callable.js";
import type { ProxyOptions, IpExtractor, HostExtractor, ProtoExtractor, IpStrategy } from "./types.js";

function createIpSelector(strategy: IpStrategy, depth?: number): (ips: string[]) => string | null {
  if (depth !== undefined) {
    const depthIndex = Math.max(0, depth - 1);
    return (ips) => ips[Math.min(depthIndex, ips.length - 1)] ?? null;
  }
  if (strategy === "last") {
    return (ips) => ips[ips.length - 1] ?? null;
  }
  return (ips) => ips[0] ?? null;
}

export function createIpExtractor<S>(config: ProxyOptions<S>["ip"]): IpExtractor<S> | null {
  if (config === false) return null;

  if (isCallable(config)) {
    return (ctx: Context<S>) => config(ctx);
  }

  const { header, depth, strategy = "first" } = config || {};
  const headers = header ? (Array.isArray(header) ? header : [header]) : [];

  // Pre-calculate the IP selection function based on strategy
  const selectIp = createIpSelector(strategy, depth);

  return (ctx: Context<S>): string | null => {
    const { request } = ctx;

    // Check custom headers first
    if (headers.length) {
      for (const h of headers) {
        const customIp = request.headers.get(h);
        if (customIp) {
          const trimmed = customIp.trim();
          if (trimmed) {
            return trimmed;
          }
        }
      }
    }

    // Check X-Forwarded-For
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const ips = forwardedFor
        .split(",")
        .map((ip) => ip.trim())
        .filter(Boolean);

      if (ips.length) {
        return selectIp(ips);
      }
    }

    // Check X-Real-IP
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;

    // Fallback to socket IP (only available in Node.js HTTP server)
    return ctx.serverAdapter.remoteAddr(ctx) || null;
  };
}

export function createHostExtractor<S>(config: ProxyOptions<S>["host"]): HostExtractor<S> | null {
  if (config === false) return null;

  if (isCallable(config)) {
    return (ctx: Context<S>) => config(ctx);
  }

  const { header = "x-forwarded-host" } = config || {};
  const headers = Array.isArray(header) ? header : [header];

  return (ctx: Context<S>) => {
    const { request } = ctx;

    // Check proxy headers if trusted
    for (const h of headers) {
      const value = request.headers.get(h);
      if (value) {
        return value;
      }
    }

    // Fallback to Host header
    return request.headers.get("host");
  };
}

export function createProtoExtractor<S>(config: ProxyOptions<S>["proto"]): ProtoExtractor<S> | null {
  if (config === false) return null;

  if (isCallable(config)) {
    return (ctx: Context<S>) => config(ctx);
  }

  const { header = "x-forwarded-proto" } = config || {};
  const headers = Array.isArray(header) ? header : [header];

  return (ctx: Context<S>) => {
    const { request } = ctx;
    // Check proxy headers if trusted
    for (const h of headers) {
      const value = request.headers.get(h);
      if (value) {
        if (value === "on" || value === "https") return "https";
        if (value === "http") return "http";
      }
    }

    // Check SSL headers
    const ssl = request.headers.get("x-forwarded-ssl") || request.headers.get("x-arr-ssl");
    if (ssl === "on") return "https";

    // Fallback to URL protocol
    return defaultExtractProto(ctx);
  };
}

export function defaultExtractProto<S>({ request }: Context<S>, _isTrusted?: boolean): string {
  return request.url.charCodeAt(4) === 115 ? "https" : "http";
}
