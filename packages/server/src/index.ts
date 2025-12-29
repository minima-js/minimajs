/**
 * @minimajs/server - High-performance HTTP framework
 * @module @minimajs/server
 * @example
 * ```typescript
 * import { createApp } from "@minimajs/server";
 *
 * const app = createApp();
 *
 * app.get("/", () => ({ message: "Hello World" }));
 *
 * app.listen({ port: 3000 });
 * ```
 */

export * from "./interceptor.js";
export * from "./http.js";
export * from "./hooks/index.js";
export * from "./types.js";

export * from "./context.js";
export { logger } from "./logger.js";
export { plugin } from "./internal/plugins.js";
export { createResponse } from "./internal/handler.js";
