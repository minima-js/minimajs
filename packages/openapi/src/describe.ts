import type { RouteMetaDescriptor } from "@minimajs/server";
import { kOperation } from "./symbols.js";
import type { OpenAPI } from "./types.js";

/**
 * Adds OpenAPI operation metadata to a route.
 *
 * @example
 * ```typescript
 * import { describe } from "@minimajs/openapi";
 *
 * app.get("/users", describe({ summary: "List all users", tags: ["Users"] }), () => {
 *   return getUsers();
 * });
 *
 * app.post("/users", describe({
 *   summary: "Create a user",
 *   description: "Creates a new user account with the provided details.",
 *   tags: ["Users"],
 *   operationId: "createUser"
 * }), () => {
 *   return createUser();
 * });
 *
 * app.get("/legacy", describe({ deprecated: true }), () => {
 *   return legacyEndpoint();
 * });
 * ```
 */
export function describe<S = any>(options: OpenAPI.OperationObject): RouteMetaDescriptor<S> {
  return [kOperation, options];
}
