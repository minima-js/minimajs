import type { Route, RouteConfig, RouteFindResult, RouteMetaDescriptor } from "../interfaces/route.js";
import type { Container } from "../interfaces/app.js";
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

export function normalizePath(path: string): `/${string}` {
  // Empty or falsy → root
  if (!path) return "/";

  // Ensure string
  let p = path;

  // Add leading slash if missing
  if (p[0] !== "/") {
    p = "/" + p;
  }

  // Collapse multiple slashes: ///a//b → /a/b
  p = p.replace(/\/{2,}/g, "/");

  // Remove trailing slash except root
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }

  return p as `/${string}`;
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
