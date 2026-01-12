import type { Context } from "../../index.js";

export interface IpSettings {
  header?: string;
  proxyDepth?: number;
}

export type IpCallback<S = unknown> = (ctx: Context<S>) => string | null;

export interface HostSettings {
  header?: string | string[];
  stripPort?: boolean;
}

export interface ProtoSettings {
  header?: string | string[];
}

export type HostCallback<S = unknown> = (ctx: Context<S>) => string;
export type ProtoCallback<S = unknown> = (ctx: Context<S>) => string;

export type TrustProxyFn<S> = (ctx: Context<S>) => boolean;

export interface ProxyOptions<S> {
  trustProxies?: boolean | string[] | TrustProxyFn<S>;
  ip?: IpSettings | IpCallback<S>;
  proto?: ProtoSettings | ProtoCallback<S>;
  host?: HostSettings | HostCallback<S>;
}
