import type { App, RouteMetaDescriptor, RouteMetadata } from "../interfaces/app.js";

/**
 * Creates a RouteMetadata map from route descriptors
 */
export function createRouteMetadata(descriptors: RouteMetaDescriptor[], app: App): RouteMetadata {
  const routeContainer: RouteMetadata = new Map();
  for (const descriptor of descriptors) {
    // Check if descriptor is a function or a tuple
    const [symbol, value] = typeof descriptor === "function" ? descriptor(app) : descriptor;
    routeContainer.set(symbol, value);
  }
  return routeContainer;
}

/**
 * Applies prefix to a path, considering exclusions
 */
export function applyRoutePrefix(path: string, prefix: string, excludeList: string[]): string {
  const shouldExclude = excludeList.some(
    (excludePath) => path === excludePath || path.startsWith(excludePath + "/")
  );
  return shouldExclude ? path : prefix + path;
}
