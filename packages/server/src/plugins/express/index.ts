import type { Server as NodeServerHttp, IncomingMessage, ServerResponse } from "node:http";
import type { Server as NodeServerHttps } from "node:https";
import { hook } from "../../hooks/index.js";
import type { Context } from "../../interfaces/index.js";

export type NodeServer = NodeServerHttp | NodeServerHttps;
export type ExpressCallback = (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => void;

/**
 * Integrates an Express-style middleware into the request lifecycle.
 *
 * This function creates a plugin that registers a middleware compatible with
 * Express.js. The middleware function receives the incoming request and response
 * objects, along with a `next` callback to signal completion or pass errors.
 *
 * @param callback - The Express-style middleware function
 * @returns A plugin that adds the middleware to the request hook
 *
 * @example
 * ```typescript
 * import { express } from '@minimajs/server/plugins/express';
 *
 * const app = createApp();
 *
 * // Use Express middleware (Only works with Node.js server)
 * app.register(
 *   express((req, res, next) => {
 *     console.log('Request URL:', req.url);
 *     next();
 *   })
 * );
 * ```
 */

export function express(callback: ExpressCallback) {
  function expressMiddleware(ctx: Context<NodeServer>) {
    return new Promise<void>((resolve, reject) => {
      callback(ctx.incomingMessage, ctx.serverResponse, (err?: unknown) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  return hook("request", expressMiddleware);
}
