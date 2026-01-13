import type { Context } from "../../index.js";

export interface IpSettings {
  header?: string;
  proxyDepth?: number;
}

export interface HostSettings {
  header?: string | string[];
  stripPort?: boolean;
}

export interface ProtoSettings {
  header?: string | string[];
}

export interface ProxyOptions<S> {
  trustProxies: boolean | string[] | ((ctx: Context<S>) => boolean);
  ip?: IpSettings | ((ctx: Context<S>) => string | null) | false;
  proto?: ProtoSettings | ((ctx: Context<S>) => string) | false;
  host?: HostSettings | ((ctx: Context<S>) => string) | false;
}

// Internal callback types used by builder functions
export type IpExtractor<S> = (ctx: Context<S>, isTrusted: boolean) => string | null;
export type HostExtractor<S> = (ctx: Context<S>, isTrusted: boolean) => string;
export type ProtoExtractor<S> = (ctx: Context<S>, isTrusted: boolean) => string;
