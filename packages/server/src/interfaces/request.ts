import type { Dict } from "../types.js";

export interface RouteOptions {
  method: string;
  url: string;
  path: string;
  params: string[];
  prefix?: string;
  handler?: unknown;
  store?: unknown;
}

export interface Request {
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
}
