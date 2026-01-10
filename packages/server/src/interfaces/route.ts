import type { FindResult, HTTPMethod } from "find-my-way";
import type { App, RouteHandler } from "./app.js";

export type RouteMetadata = Map<symbol, unknown>;

export interface Route<S = unknown> {
  methods: HTTPMethod[];
  params?: { [key: string]: string | undefined };
  handler: RouteHandler<S>;
  path: string;
  metadata: RouteMetadata;
}

export interface RouteConfig<S = unknown> extends Omit<Route<S>, "params"> {
  app: App<S>;
}

export type RouteMetaDescriptor<S = unknown> = [symbol: symbol, value: unknown] | ((config: RouteConfig<S>) => void);

export interface RouteOptions {
  method: HTTPMethod | HTTPMethod[];
  path: string;
}

export interface PrefixOptions {
  exclude?: string[];
}

export interface RouteFindResult<T> extends FindResult<any> {
  store: RouteConfig<T>;
}
