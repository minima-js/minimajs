import type { FindResult, HTTPMethod } from "find-my-way";
import type { App, RouteHandler, RouteMetadata } from "./app.js";

export interface Route {
  methods: HTTPMethod[];
  params?: { [key: string]: string | undefined };
  handler: RouteHandler;
  path: string;
  metadata: RouteMetadata;
}

export interface RouteFindResult<T> extends FindResult<any> {
  store: Omit<Route, "params"> & { server: App<T> };
}
