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

// Exports Contexts
export type { Context } from "./internal/context.js";
export * from "./context.js";

// Export Intercetpros
export * from "./interceptor.js";

export * from "./http.js";
export * from "./hooks/index.js";
export * from "./interfaces/index.js";

export { logger } from "./logger.js";
export { plugin } from "./internal/plugins.js";
