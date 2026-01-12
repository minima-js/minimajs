import type { Context } from "../../index.js";
import { isCallable } from "../../utils/callable.js";
import { HttpError } from "../../error.js";
import type { HostCallback, HostSettings, ProtoCallback, ProtoSettings, TrustProxyFn } from "./types.js";

function stripPortFromHost(host: string): string {
  const colonIndex = host.indexOf(":");
  return colonIndex === -1 ? host : host.slice(0, colonIndex);
}

export function extractHost<S>(resolve: HostSettings, shouldTrust: (ctx: Context<S>) => boolean): HostCallback<S> {
  if (isCallable(resolve)) {
    return resolve;
  }

  const { header = "x-forwarded-host", stripPort = false } = resolve;
  const processHost = stripPort ? stripPortFromHost : (host: string) => host;

  return function (ctx) {
    const { request } = ctx;

    if (shouldTrust(ctx)) {
      const headers = Array.isArray(header) ? header : [header];
      for (const h of headers) {
        const value = request.headers.get(h);
        if (value) {
          return processHost(value);
        }
      }
    }

    const fallback = request.headers.get("host");
    if (!fallback) {
      throw new HttpError("Missing Host header", 400);
    }

    return processHost(fallback);
  };
}

export function getDefaultHost<S>({ request }: Context<S>): string {
  const host = request.headers.get("host");
  if (!host) {
    throw new HttpError("Missing Host header", 400);
  }
  return host;
}

export function extractProto<S>(resolve: ProtoSettings, shouldTrust: TrustProxyFn<S>): ProtoCallback<S> {
  if (isCallable(resolve)) {
    return resolve;
  }

  return function (ctx) {
    const { request } = ctx;
    const { header = "x-forwarded-proto" } = resolve;

    if (shouldTrust(ctx)) {
      const headers = Array.isArray(header) ? header : [header];
      for (const h of headers) {
        const value = request.headers.get(h);
        if (value) {
          if (value === "on" || value === "https") return "https";
          if (value === "http") return "http";
        }
      }

      const ssl = request.headers.get("x-forwarded-ssl") || request.headers.get("x-arr-ssl");
      if (ssl === "on") return "https";
    }

    return "https";
  };
}

export function getDefaultProto<S>({ request }: Context<S>): string {
  if (request.url.charCodeAt(4) === 115) {
    return "https";
  }
  return "http";
}
