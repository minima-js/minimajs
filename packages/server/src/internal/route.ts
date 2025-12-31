import type { App, RouteHandler, RouteMetaDescriptor, RouteMetadata } from "../interfaces/app.js";
import type { Route, RouteFindResult } from "../interfaces/route.js";
import { getDescriptorsAll } from "./descriptor.js";

/**
 * Creates a RouteMetadata map from route descriptors
 */
export function createRouteMetadata<T>(
  descriptors: RouteMetaDescriptor[],
  path: string,
  handler: RouteHandler,
  app: App<T>
): RouteMetadata {
  const routeContainer: RouteMetadata = new Map();
  for (const descriptor of [...getDescriptorsAll(app.container), ...descriptors]) {
    const [name, value] = typeof descriptor === "function" ? descriptor(path, handler, app) : descriptor;
    if (!routeContainer.has(name)) {
      routeContainer.set(name, new Set());
    }
    routeContainer.get(name)!.add(value);
  }
  return routeContainer;
}

/**
 * Applies prefix to a path, considering exclusions
 */
export function applyRoutePrefix(path: string, prefix: string, excludeList: string[]): string {
  const shouldExclude = excludeList.some((excludePath) => path === excludePath || path.startsWith(excludePath + "/"));
  return shouldExclude ? path : prefix + path;
}

export function result2route(route: RouteFindResult<unknown>): Route {
  return {
    params: route.params,
    methods: route.store.methods,
    handler: route.store.handler,
    path: route.store.path,
    metadata: route.store.metadata,
  } satisfies Route;
}
