/**
 * Built-in plugins for Minima.js framework.
 *
 * Provides essential plugins for common web server functionality including
 * body parsing, CORS, routing, and graceful shutdown.
 *
 * @module @minimajs/server/plugins
 *
 * @example
 * ```typescript
 * import { bodyParser, cors, shutdown } from '@minimajs/server/plugins';
 *
 * const app = createApp();
 *
 * // Register plugins
 * app.register(bodyParser());
 * app.register(cors({ origin: 'https://example.com' }));
 * app.register(shutdown());
 * ```
 */

export * from "./body-parser.js";
export * from "./router.js";
export { shutdown, type ShutdownOptions as GracefulShutdownOptions } from "./shutdown.js";
export { cors, type CorsOptions } from "./cors.js";
