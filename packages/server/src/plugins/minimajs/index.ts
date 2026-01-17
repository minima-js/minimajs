import { hook } from "../../hooks/index.js";
import { createContext } from "../../context.js";

export type ErrorCallback = (response: Response) => void | Promise<void>;
export type DeferCallback = (response: Response) => void | Promise<void>;

// Create context for storing deferred callbacks
const [getDeferredCallbacks] = createContext<Set<DeferCallback>>(() => new Set());
const [getErrorCallbacks] = createContext<Set<ErrorCallback>>(() => new Set());

/**
 * Registers a callback to execute after the response.
 * Useful for cleanup tasks, logging, or post-response processing.
 *
 * @param cb - The callback function to execute after response
 *
 * @example
 * ```typescript
 * import { defer } from '@minimajs/server';
 *
 * app.get('/user/:id', async (req) => {
 *   const user = await getUser(params.get('id'));
 *
 *   defer(() => {
 *     console.log('Response send, logging metrics...');
 *     logMetrics('user-fetched', { userId: user.id });
 *   });
 *
 *   return user;
 * });
 * ```
 */
export function defer(cb: DeferCallback) {
  getDeferredCallbacks().add(cb);
}

/**
 * Registers an error handling callback for the current request context.
 * Called when an error occurs during request processing.
 *
 * @param cb - The callback function to execute when an error occurs
 *
 * @example
 * ```typescript
 * import { onError } from '@minimajs/server';
 *
 * app.get('/data', async (req) => {
 *   onError((err) => {
 *     console.error('Request failed:', err);
 *     // Cleanup resources, log to monitoring, etc.
 *   });
 *
 *   const data = await fetchData();
 *   return data;
 * });
 * ```
 */
export function onError(cb: ErrorCallback) {
  getErrorCallbacks().add(cb);
}

/**
 * Creates a plugin that enables defer and onError functionality.
 * This plugin registers hooks to run deferred callbacks after response is sent
 * and error callbacks when an error occurs.
 *
 * @returns A plugin that adds defer and onError functionality to the app
 *
 * @example
 * ```typescript
 * import { minimaPlugin } from '@minimajs/server/plugins';
 *
 * const app = createApp();
 * app.register(minimaPlugin());
 * ```
 */
export function minimajs() {
  async function send(response: Response) {
    if (!response.ok) await sendError(response);
    for (const cb of getDeferredCallbacks()) {
      try {
        await cb(response);
      } catch {
        // pass
      }
    }
  }

  async function sendError(response: Response) {
    for (const cb of getErrorCallbacks()) {
      try {
        await cb(response);
      } catch {
        // pass
      }
    }
  }

  return hook("send", send);
}
