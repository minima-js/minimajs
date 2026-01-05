/**
 * Node.js runtime server adapter for MinimaJS.
 *
 * This module provides the main entry point for creating MinimaJS applications
 * that run on Node.js runtime. It wraps the base server functionality with
 * Node.js-specific HTTP/HTTPS server adapter.
 *
 * @module @minimajs/server/node
 *
 * @example
 * ```typescript
 * import { createApp } from '@minimajs/server/node';
 *
 * const app = createApp();
 *
 * app.get('/hello', () => {
 *   return { message: 'Hello from Node.js!' };
 * });
 *
 * app.listen({ port: 3000 });
 * ```
 */

import type { Server } from "node:http";
import type { CreateBaseSeverOptions } from "../core/index.js";
import { createBaseServer } from "../core/index.js";
import { NodeServerAdapter, type NodeServerOptions } from "./server.js";

export type { NodeServerOptions };

/**
 * Configuration options for creating a Node.js-based MinimaJS application.
 *
 * Extends the base server options with Node.js-specific server configuration.
 */
export interface NodeAppOptions extends CreateBaseSeverOptions {
  /**
   * Node.js-specific server options including HTTP/HTTPS configuration
   */
  server?: NodeServerOptions;
}

/**
 * Creates a new MinimaJS application for Node.js runtime.
 *
 * @param options - Configuration options for the application
 * @returns A configured MinimaJS application instance
 *
 * @example
 * ```typescript
 * import { createApp } from '@minimajs/server/node';
 *
 * const app = createApp();
 * app.get('/api/users', () => [{ id: 1, name: 'John' }]);
 * app.listen({ port: 3000 });
 * ```
 */
export function createApp({ server, ...options }: NodeAppOptions = {}) {
  return createBaseServer<Server>(new NodeServerAdapter(server), options);
}
