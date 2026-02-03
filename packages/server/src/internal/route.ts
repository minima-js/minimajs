import type { Route, RouteConfig, RouteFindResult, RouteMetaDescriptor } from "../interfaces/route.js";
import type { Container } from "../interfaces/index.js";
import { kAppDescriptor } from "../symbols.js";

export function getAppRouteDescriptors<S>(container: Container<S>) {
  return container[kAppDescriptor];
}

/**
 * Creates a RouteMetadata map from route descriptors
 */
export function applyRouteMetadata<T>(route: RouteConfig<T>, descriptors: RouteMetaDescriptor<T>[]): void {
  const { app, metadata } = route;
  for (const descriptor of [...getAppRouteDescriptors<T>(app.container), ...descriptors]) {
    if (Array.isArray(descriptor)) {
      const [name, value] = descriptor;
      metadata[name] = value;
      continue;
    }
    descriptor(route);
  }
}

/**
 * Applies prefix to a path, considering exclusions
 */
export function applyRoutePrefix(path: string, prefix: string): string {
  return prefix + path;
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
