import type { FindResult, HTTPMethod } from "find-my-way";
import type { App, RouteHandler, RouteMetadata } from "./app.js";

export interface Route<S = unknown> {
  methods: HTTPMethod[];
  params?: { [key: string]: string | undefined };
  handler: RouteHandler<S>;
  path: string;
  metadata: RouteMetadata;
}

export type RouteMetaDescriptor<S = unknown> =
  | [symbol: symbol, value: unknown]
  | ((path: string, handler: RouteHandler<S>, app: App<S>) => [symbol: symbol, value: unknown]);

export interface RouteOptions {
  method: HTTPMethod | HTTPMethod[];
  path: string;
}

export interface PrefixOptions {
  exclude?: string[];
}

export interface RouteFindResult<T> extends FindResult<any> {
  store: Omit<Route<T>, "params"> & { server: App<T> };
}
