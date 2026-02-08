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
 * @param meta - One or more route metadata descriptors to apply to all routes in the module
 * @returns A plugin that registers the descriptors for route metadata
 *
 * @example
 * ```typescript
 * // Single descriptor
 * app.register(descriptor([authTag, "required"]));
 *
 * // Multiple descriptors
 * app.register(descriptor(
 *   [authTag, "required"],
 *   [rateLimitTag, { max: 100 }],
 *   describe({ tags: ["Users"] })
 * ));
 *
 * // Function descriptor for dynamic metadata
 * app.register(descriptor((route) => {
 *   route.metadata[kPath] = route.path;
 * }));
 *
 * // In module meta.plugins
 * export const meta = {
 *   plugins: [
 *     descriptor([adminTag, true], describe({ tags: ["Admin"] })),
 *   ],
 * };
 * ```
 */
export function descriptor<T>(...meta: RouteMetaDescriptor<T>[]) {
  return plugin.sync<T>((app) => {
    getAppRouteDescriptors<T>(app.container).push(...meta);
  });
}
