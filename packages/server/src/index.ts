import type { Server } from "node:http";
import fastify from "fastify";
import merge from "deepmerge";
import { appPlugin } from "./internal/plugins.js";
import type { App, AppOptions } from "./types.js";
import { loggerOptions } from "./logger.js";
import { shutdownListener } from "./shutdown.js";
import { logRoutes } from "./router.js";
import { triggerOnCreateApp } from "./hooks.js";

export * from "./http.js";
export * from "./hooks.js";
export * from "./types.js";
export * from "./module.js";

export { createContext } from "./context.js";
export { logger } from "./logger.js";

function getDefaultConfig({ logger: loggerOverride, ...override }: AppOptions): AppOptions {
  let logger = loggerOptions;
  if (loggerOverride && loggerOverride !== true) {
    logger = merge(logger, loggerOverride);
  }

  return {
    trustProxy: true,
    disableRequestLogging: true,
    logger: loggerOverride === false ? false : logger,
    ...override,
  };
}
/**
 * Create an app instance
 */
export function createApp({ killSignal = ["SIGTERM"], routes = { log: true }, ...opts }: AppOptions = {}): App {
  const app = fastify<Server>(getDefaultConfig(opts));
  shutdownListener(app, killSignal);
  app.register(appPlugin);
  if (routes.log) {
    app.addHook("onReady", () => logRoutes(app));
  }
  app.addHook("onReady", () => triggerOnCreateApp(app));
  return app;
}
