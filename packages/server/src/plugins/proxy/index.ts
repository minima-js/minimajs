import { hook, type Context } from "../../index.js";
import { kIpAddr } from "../../symbols.js";
import type { ProxyOptions, ProxyIpPluginOptions } from "./types.js";
import { createTrustValidator } from "./trust.js";
import { createHostExtractor, createIpExtractor, createProtoExtractor, defaultExtractProto } from "./extractors.js";

/**
 * Proxy plugin that extracts client information from proxy headers.
 * Useful when your application is behind a reverse proxy or load balancer.
 *
 * By default, the plugin collects IP, host, and proto metadata even when not behind
 * a trusted proxy. Disable individual features by setting them to false.
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
export function proxy<S>(options: ProxyOptions<S> = {}) {
  // Determine trust validator
  const isTrusted = createTrustValidator(options.trustProxies);

  // Build IP extractor
  const extractIp = createIpExtractor(options.ip);

  // Build host extractor
  const extractHost = createHostExtractor(options.host);

  // Build proto extractor
  let extractProto = createProtoExtractor(options.proto);
  if (extractHost && !extractProto) {
    extractProto = defaultExtractProto;
  }

  return hook("request", (ctx: Context<S>) => {
    if (!isTrusted(ctx)) return;
    // Extract IP
    if (extractIp) {
      const ip = extractIp(ctx);
      if (ip) {
        ctx.locals[kIpAddr] = ip;
      }
    }

    if (extractHost) {
      const host = extractHost(ctx);
      if (host) {
        ctx.$metadata.host = host;
      }
    }

    if (extractProto) {
      ctx.$metadata.proto = extractProto(ctx);
    }
  });
}
export namespace proxy {
  export function ip<S>(options: ProxyIpPluginOptions<S> = {}) {
    const ipOptions = options.ip;
    const trustOptions = options.trustProxies;
    const extractIp = createIpExtractor(ipOptions);
    const trustValidator = createTrustValidator(trustOptions);

    return hook("request", (ctx: Context<S>) => {
      const isTrusted = trustValidator(ctx);
      if (!isTrusted) return;
      if (!extractIp) return;
      const ip = extractIp(ctx);
      if (ip) {
        ctx.locals[kIpAddr] = ip;
      }
    });
  }
}
