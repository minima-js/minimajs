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

// Re-export core for backwards compatibility (App interface, types, etc.)
export * from "./core/server.js";

export { logger } from "./logger.js";

// Exporting all types
export * from "./interfaces/index.js";

// Exports Contexts
export * from "./context.js";

// Export Intercetpros
export * from "./interceptor.js";

export * from "./http.js";
export * from "./hooks/index.js";

export { type StatusCode } from "./internal/response.js";
export { defer, onError, type DeferCallback, type ErrorCallback } from "./plugins/minimajs/index.js";

export * from "./plugin.js";
export { compose } from "./compose.js";

export { createApp } from "./node/index.js";
