/**
 * Plugin utilities and utilities
 *
 * Collection of utility plugins for Minima.js applications including routing utilities
 * and graceful shutdown handling.
 *
 * @module @minimajs/server/plugins
 *
 * @example
 * ```typescript
 * import { gracefulShutdown } from '@minimajs/server/plugins';
 *
 * app.register(gracefulShutdown({ timeout: 5000 }));
 * ```
 */

export * from "./router.js";
export { gracefulShutdown, type GracefulShutdownOptions } from "./shutdown.js";
