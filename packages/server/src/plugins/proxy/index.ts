import { hook, type Context } from "../../index.js";
import { kIpAddr } from "../../symbols.js";
import { HttpError } from "../../error.js";
import { isCallable } from "../../utils/callable.js";
import type { ProxyOptions, IpExtractor, HostExtractor, ProtoExtractor } from "./types.js";
import { createTrustValidator } from "./trust.js";

/**
 * Proxy plugin that extracts client information from proxy headers.
 * Useful when your application is behind a reverse proxy or load balancer.
 *
 * By default, all features (IP, host, proto) are enabled when trustProxies is set.
 * Set individual options to false to disable specific features.
 *
 * @param options - Configuration for extracting IP, protocol, and hostname
 * @returns A request hook that processes proxy headers
 *
 * @example
 * ```ts
 * // Basic usage - auto-enables IP, host, and proto extraction
 * app.register(proxy({
 *   trustProxies: true
 * }));
 *
 * // Disable specific features
 * app.register(proxy({
 *   trustProxies: true,
 *   ip: {},  // Custom settings
 *   host: false,  // Disable host extraction
 *   proto: false  // Disable proto extraction
 * }));
 *
 * // Trust specific proxy IPs
 * app.register(proxy({
 *   trustProxies: ['127.0.0.1', '10.0.0.1'],
 *   ip: { proxyDepth: 2 },
 *   host: { stripPort: true }
 * }));
 *
 * // Multiple header fallback for different cloud providers
 * app.register(proxy({
 *   trustProxies: true,
 *   proto: {
 *     header: ['x-forwarded-proto', 'cloudfront-forwarded-proto', 'x-arr-ssl']
 *   },
 *   host: {
 *     header: ['x-forwarded-host', 'x-original-host'],
 *     stripPort: true
 *   }
 * }));
 *
 * // Custom trust validator
 * app.register(proxy({
 *   trustProxies: (ctx) => {
 *     const ip = ctx.incomingMessage?.socket?.remoteAddress;
 *     return ip?.startsWith('10.') || ip === '127.0.0.1';
 *   },
 *   ip: { proxyDepth: 2 }
 * }));
 *
 * // Custom callbacks for complex scenarios
 * app.register(proxy({
 *   trustProxies: true,
 *   ip: (ctx) => ctx.request.headers.get('x-real-ip') || null,
 *   proto: (ctx) => ctx.request.headers.get('x-forwarded-proto') || 'https',
 *   host: (ctx) => ctx.request.headers.get('host') || 'example.com'
 * }));
 * ```
 */
export function proxy<S>(options: ProxyOptions<S>) {
  // Determine trust validator
  const trustValidator = createTrustValidator(options.trustProxies);

  // Build IP extractor
  const extractIp = createIpExtractor(options.ip);

  // Build host extractor
  const extractHost = createHostExtractor(options.host);

  // Build proto extractor
  const extractProto = createProtoExtractor(options.proto);

  return hook("request", (ctx: Context<S>) => {
    const isTrusted = trustValidator(ctx);

    // Extract IP
    if (extractIp) {
      const ip = extractIp(ctx, isTrusted);
      if (ip) {
        ctx.locals[kIpAddr] = ip;
      }
    }

    // Extract host and proto (must be set together)
    if (extractHost || extractProto) {
      const { $metadata, request } = ctx;
      $metadata.proto = extractProto ? extractProto(ctx, isTrusted) : defaultExtractProto(request);
      $metadata.host = extractHost ? extractHost(ctx, isTrusted) : defaultExtractHost(request);
    }
  });
}

function defaultExtractProto(request: Request): string {
  return request.url.charCodeAt(4) === 115 ? "https" : "http";
}

function defaultExtractHost(request: Request): string {
  const host = request.headers.get("host");
  if (!host) {
    throw new HttpError("Missing Host header", 400);
  }
  return host;
}

function createIpExtractor<S>(config: ProxyOptions<S>["ip"]): IpExtractor<S> | null {
  if (config === false) return null;

  if (isCallable(config)) {
    return (ctx: Context<S>) => config(ctx);
  }

  const { header, proxyDepth = 1 } = config || {};

  return (ctx: Context<S>, isTrusted: boolean) => {
    const { request } = ctx;

    // Check custom header first
    if (header && isTrusted) {
      const customIp = request.headers.get(header);
      if (customIp) return customIp;
    }

    // Check X-Forwarded-For
    if (isTrusted) {
      const forwardedFor = request.headers.get("x-forwarded-for");
      if (forwardedFor) {
        const ips = forwardedFor.split(",").map((ip) => ip.trim());
        // X-Forwarded-For format: client, proxy1, proxy2, ...
        // proxyDepth=1: get ips[0] (first IP = original client)
        // proxyDepth=2: get ips[1] (second IP = first proxy, which added original client)
        const index = Math.min(proxyDepth - 1, ips.length - 1);
        return ips[index] || null;
      }

      // Check X-Real-IP
      const realIp = request.headers.get("x-real-ip");
      if (realIp) return realIp;
    }

    // Fallback to socket IP (only available in Node.js HTTP server)
    return ctx.serverAdapter.remoteAddr(ctx);
  };
}

function createHostExtractor<S>(config: ProxyOptions<S>["host"]): HostExtractor<S> | null {
  if (config === false) return null;

  if (isCallable(config)) {
    return (ctx: Context<S>) => config(ctx);
  }

  const { header = "x-forwarded-host", stripPort = false } = config || {};
  const headers = Array.isArray(header) ? header : [header];

  return (ctx: Context<S>, isTrusted: boolean) => {
    const { request } = ctx;

    // Check proxy headers if trusted
    if (isTrusted) {
      for (const h of headers) {
        const value = request.headers.get(h);
        if (value) {
          return stripPort ? stripPortFromHost(value) : value;
        }
      }
    }

    // Fallback to Host header
    const fallback = request.headers.get("host");
    if (!fallback) {
      throw new HttpError("Missing Host header", 400);
    }

    return stripPort ? stripPortFromHost(fallback) : fallback;
  };
}

function createProtoExtractor<S>(config: ProxyOptions<S>["proto"]): ProtoExtractor<S> | null {
  if (config === false) return null;

  if (isCallable(config)) {
    return (ctx: Context<S>) => config(ctx);
  }

  const { header = "x-forwarded-proto" } = config || {};
  const headers = Array.isArray(header) ? header : [header];

  return (ctx: Context<S>, isTrusted: boolean) => {
    const { request } = ctx;

    // Check proxy headers if trusted
    if (isTrusted) {
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
    }

    // Fallback to URL protocol
    return request.url.charCodeAt(4) === 115 ? "https" : "http";
  };
}

function stripPortFromHost(host: string): string {
  const colonIndex = host.indexOf(":");
  return colonIndex === -1 ? host : host.slice(0, colonIndex);
}
