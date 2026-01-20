import type { FindResult, HTTPMethod } from "find-my-way";
import type { App, Handler } from "./app.js";

export type RouteMetadata = Record<symbol, unknown>;

export interface Route<S> {
  methods: HTTPMethod[];
  params: { [key: string]: string | undefined } | undefined;
  handler: Handler<S>;
  path: string;
  metadata: RouteMetadata;
}

export interface RouteConfig<S> extends Omit<Route<S>, "params"> {
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
