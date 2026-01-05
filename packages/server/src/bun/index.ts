/**
 * Bun runtime server adapter for MinimaJS.
 *
 * This module provides the main entry point for creating MinimaJS applications
 * that run on the Bun runtime. It wraps the base server functionality with
 * Bun-specific server adapter.
 *
 * @module @minimajs/server/bun
 *
 * @example
 * ```typescript
 * import { createApp } from '@minimajs/server/bun';
 *
 * const app = createApp();
 *
 * app.get('/hello', (req, res) => {
 *   res.json({ message: 'Hello from Bun!' });
 * });
 * app.listen({ port: 1234 })
 * ```
 */

import type { CreateBaseSeverOptions } from "../interfaces/server.js";
import { BunServerAdapter, type BunServeOptions } from "./server.js";
import { createBaseServer } from "../server.js";

export type { BunServeOptions };

/**
 * Configuration options for creating a Bun-based MinimaJS application.
 *
 * @template T - Type for additional server context data
 */
export interface BunAppOptions<T> extends CreateBaseSeverOptions {
  /**
   * Bun-specific server configuration options.
   * These options are passed directly to Bun.serve().
   */
  server?: BunServeOptions<T>;
}

/**
 * Creates a new MinimaJS application using the Bun runtime adapter.
 *
 * This is the primary factory function for initializing MinimaJS applications
 * on Bun. It sets up the server with Bun-specific optimizations and returns
 * a configured application instance.
 *
 * @template T - Type for additional server context data
 * @param options - Configuration options for the application
 * @returns A configured MinimaJS server instance
 *
 * @example
 * ```typescript
 * const app = createApp({
 *   server: {
 *     development: process.env.NODE_ENV !== 'production'
 *   }
 * });
 * ```
 */
export function createApp<T = unknown>({ server, ...options }: BunAppOptions<T> = {}) {
  return createBaseServer(new BunServerAdapter<T>(server), options);
}
