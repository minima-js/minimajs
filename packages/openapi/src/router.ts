import type { App, RouteConfig } from "@minimajs/server";

export interface Route {
  method: string;
  path: string;
  pattern: string;
  params: string[];
  opts: object;
  handler: Function;
  store: RouteConfig<unknown>;
}
export function getRoutes(app: App): Route[] {
  return (app.router as unknown as { routes: Route[] }).routes;
}
