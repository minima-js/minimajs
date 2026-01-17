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

export * from "./body-parser/index.js";
export * from "./router/index.js";
export * from "./shutdown/index.js";
export * from "./cors/index.js";
export * from "./proxy/index.js";
export * from "./descriptor/index.js";
export * from './express/index.js';