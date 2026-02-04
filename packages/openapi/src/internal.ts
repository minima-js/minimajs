import type { RouteMetaDescriptor } from "@minimajs/server";
import { kInternal } from "./symbols.js";

/**
 * Marks a route as internal, excluding it from the OpenAPI spec.
 *
 * @example
 * ```typescript
 * import { internal } from "@minimajs/openapi";
 *
 * // Health check - not part of public API
 * app.get("/health", internal(), () => "ok");
 *
 * // Internal admin endpoint
 * app.get("/admin/metrics", internal(), () => getMetrics());
 * ```
 */
export function internal(isInternal = true): RouteMetaDescriptor {
  return [kInternal, isInternal];
}
