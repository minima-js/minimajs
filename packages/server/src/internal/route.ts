import type { App, Container, RouteHandler, RouteMetadata } from "../interfaces/app.js";
import type { Route, RouteFindResult, RouteMetaDescriptor } from "../interfaces/route.js";
import { kAppDescriptor } from "../symbols.js";

export function getDescriptorsAll<S = unknown>(container: Container) {
  return container.get(kAppDescriptor) as RouteMetaDescriptor<S>[];
}

/**
 * Creates a RouteMetadata map from route descriptors
 */
export function createRouteMetadata<T>(
  descriptors: RouteMetaDescriptor<T>[],
  path: string,
  handler: RouteHandler<T>,
  app: App<T>
): RouteMetadata {
  const routeContainer: RouteMetadata = new Map();
  for (const descriptor of [...getDescriptorsAll<T>(app.container), ...descriptors]) {
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

export function result2route<T>(route: RouteFindResult<T>): Route<T> {
  return {
    params: route.params,
    methods: route.store.methods,
    handler: route.store.handler,
    path: route.store.path,
    metadata: route.store.metadata,
  } satisfies Route<T>;
}
