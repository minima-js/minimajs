import type { Server } from "node:http";
import fastify from "fastify";
import merge from "deepmerge";
import chalk from "chalk";
import { appPlugin } from "./internal/plugins.js";
import type { App, AppOptions } from "./types.js";
import { loggerOptions } from "./logger.js";
import { shutdownListener } from "./shutdown.js";

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
export function createApp({
  killSignal = ["SIGTERM", "SIGUSR2"],
  routes = { log: true },
  ...opts
}: AppOptions = {}): App {
  const app = fastify<Server>(getDefaultConfig(opts));
  shutdownListener(app, killSignal);
  app.register(appPlugin);
  function logRoutes() {
    console.log(
      chalk.magenta(
        app.printRoutes({
          commonPrefix: false,
        })
      )
    );
  }
  if (routes.log) {
    app.addHook("onReady", logRoutes);
  }
  return app;
}
