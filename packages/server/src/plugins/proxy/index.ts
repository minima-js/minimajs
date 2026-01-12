import { hook, type Context } from "../../index.js";
import { kIpAddr } from "../../symbols.js";
import { isCallable } from "../../utils/callable.js";
import type { ProxyOptions, IpCallback } from "./types.js";
import { createTrustValidator } from "./trust.js";
import { extractIpAddress } from "./ip.js";
import { extractHost, getDefaultHost, extractProto, getDefaultProto } from "./host.js";

/**
 * Proxy plugin that extracts client information from proxy headers.
 * Useful when your application is behind a reverse proxy or load balancer.
 *
 * @param options - Configuration for extracting IP, protocol, and hostname
 * @returns A request hook that processes proxy headers
 *
 * @example
 * ```ts
 * // Basic usage - trust all proxies
 * app.register(proxy({
 *   trustProxies: true,
 *   ip: {}
 * }));
 *
 * // Trust specific proxy IPs
 * app.register(proxy({
 *   trustProxies: ['127.0.0.1', '10.0.0.1'],
 *   ip: {},
 *   proto: { header: 'x-forwarded-proto' },
 *   host: { header: 'x-forwarded-host', stripPort: true }
 * }));
 *
 * // Multiple header fallback for different cloud providers
 * app.register(proxy({
 *   trustProxies: true,
 *   ip: {},
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
  const shouldTrust = createTrustValidator<S>(options.trustProxies);
  let getIpAddress: IpCallback<S> | undefined;
  if (options.ip) {
    getIpAddress = isCallable(options.ip) ? (options.ip as IpCallback<S>) : extractIpAddress<S>(options.ip, shouldTrust);
  }

  let getHostFn = getDefaultHost<S>;

  if (options.host) {
    getHostFn = isCallable(options.host) ? options.host : extractHost<S>(options.host, shouldTrust);
  }

  let getProtoFn = getDefaultProto<S>;
  if (options.proto) {
    getProtoFn = isCallable(options.proto) ? options.proto : extractProto<S>(options.proto, shouldTrust);
  }

  const shouldReconstructUrl = Boolean(options.host || options.proto);

  function process(ctx: Context<S>) {
    if (getIpAddress) {
      ctx.locals[kIpAddr] = getIpAddress(ctx);
    }

    if (shouldReconstructUrl) {
      const proto = getProtoFn(ctx);
      const host = getHostFn(ctx);
      const { $metadata: metadata, request } = ctx;
      const path = request.url.slice(metadata.pathStart);
      metadata.url = new URL(`${proto}://${host}${path}`);
      metadata.searchParams = metadata.url.searchParams;
    }
  }

  return hook("request", process);
}
