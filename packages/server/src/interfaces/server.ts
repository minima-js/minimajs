import type { Config as RouterConfig, HTTPVersion } from "find-my-way";
import type { Logger } from "pino";

export interface AddressInfo {
  hostname: string;
  port: number;
  family: "IPv4" | "IPv6" | "unix";
  protocol: "http" | "https";
  address: string;
}

export interface ListenOptions {
  port: number;
  host?: string;
}

export type RequestHandler = (request: Request) => Promise<Response>;

export interface ListenResult<T> {
  server: T;
  address: AddressInfo;
}

export interface ServerAdapter<T> {
  listen(opts: ListenOptions, requestHandler: RequestHandler): Promise<ListenResult<T>>;
  close(server: T): Promise<void>;
}

export interface CreateBaseSeverOptions {
  router?: RouterConfig<HTTPVersion>;
  prefix?: string;
  logger?: Logger | false;
}
