import type { FindResult, HTTPMethod } from "find-my-way";
import type { App, RouteHandler, RouteMetadata } from "./app.js";

export interface Route {
  methods: HTTPMethod[];
  params?: { [key: string]: string | undefined };
  handler: RouteHandler;
  path: string;
  metadata: RouteMetadata;
}

export type RouteMetaDescriptor =
  | [symbol: symbol, value: unknown]
  | ((path: string, handler: RouteHandler, app: App) => [symbol: symbol, value: unknown]);

export interface RouteOptions {
  method: HTTPMethod | HTTPMethod[];
  path: string;
}

export interface PrefixOptions {
  exclude?: string[];
}

export interface RouteFindResult<T> extends FindResult<any> {
  store: Omit<Route, "params"> & { server: App<T> };
}
