import type { Dict } from "../types.js";
import type { App } from "./app.js";

export interface RouteOptions {
  method: string;
  path: string;
  params: string[];
  prefix?: string;
  handler?: unknown;
  store?: unknown;
}

export interface Request<TRaw = any, TServer = App> {
  readonly raw: TRaw;
  readonly server: TServer;
  readonly socket?: any;
  id: string;
  params: Dict<string>;
  query: Dict<string | string[]>;
  body: unknown;
  hostname: string;
  ip: string;
  protocol: string;
  url: string;
  originalUrl: string;
  method: string;
  routeOptions: RouteOptions;
}
