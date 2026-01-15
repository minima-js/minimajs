import type { Context } from "../../index.js";

export type IpStrategy = "first" | "last" | "depth";

export interface IpSettings {
  header?: string | string[];
  depth?: number;
  strategy?: IpStrategy;
}

export interface HostSettings {
  header?: string | string[];
}

export interface ProtoSettings {
  header?: string | string[];
}

export interface TrustProxyConfig<S> {
  proxies?: string[];
  validator?: (ctx: Context<S>, ip: string | null) => boolean;
}

export interface ProxyOptions<S> {
  trustProxies?: string[] | TrustProxyConfig<S> | ((ctx: Context<S>) => boolean);
  ip?: IpSettings | IpExtractor<S> | false;
  proto?: ProtoSettings | ProtoExtractor<S> | false;
  host?: HostSettings | HostExtractor<S> | false;
}

export interface ProxyIpPluginOptions<S> {
  trustProxies?: ProxyOptions<S>["trustProxies"];
  ip?: ProxyOptions<S>["ip"];
}

// Internal callback types used by builder functions
export type IpExtractor<S> = (ctx: Context<S>) => string | null;
export type HostExtractor<S> = (ctx: Context<S>) => string | null;
export type ProtoExtractor<S> = (ctx: Context<S>) => string;
