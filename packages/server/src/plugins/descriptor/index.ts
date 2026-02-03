import type { RouteMetaDescriptor } from "../../interfaces/route.js";
import { getAppRouteDescriptors } from "../../internal/route.js";
import { plugin } from "../../plugin.js";

/**
 * Creates a plugin that adds metadata to all routes registered within its scope.
 *
 * Route descriptors can be either:
 * - A tuple `[key, value]` to set a specific metadata entry
 * - A function that receives the route config and can modify metadata dynamically
 *
 * @param meta - The route metadata descriptor to apply to all routes in the module
 * @returns A plugin that registers the descriptor for route metadata
 *
 * @example
 * ```typescript
 * // Using a tuple descriptor to tag all routes
 * const authTag = Symbol("auth");
 * app.register(descriptor([authTag, "required"]));
 *
 * // Using a function descriptor for dynamic metadata
 * app.register(descriptor((route) => {
 *   route.metadata.set(Symbol("path"), route.path);
 * }));
 *
 * // Scoped to a specific module
 * async function adminModule(app) {
 *   app.register(descriptor([adminTag, true]));
 *   app.get("/dashboard", handler); // Will have adminTag metadata
 * }
 * ```
 */
export function descriptor<T>(meta: RouteMetaDescriptor<T>) {
  return plugin.sync<T>((app) => {
    getAppRouteDescriptors<T>(app.container).push(meta);
  });
}
