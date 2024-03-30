import type { Server } from "node:http";
import fastify from "fastify";
import merge from "deepmerge";
import chalk from "chalk";
import { appPlugin } from "./internal/plugins.js";
import type { App, AppOptions } from "./types.js";
import { loggerOptions } from "./logger.js";

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

export function createApp({ routes = { log: true }, ...opts }: AppOptions = {}): App {
  const app = fastify<Server>(getDefaultConfig(opts));
  app.register(appPlugin);

  async function quit(sig: string) {
    app.log.info(`${sig}: %s`, "closing server");
    await app.close();
    app.log.info("finished all requests");
  }

  function logRoutes() {
    console.log(
      chalk.magenta(
        app.printRoutes({
          commonPrefix: false,
        })
      )
    );
  }

  process.on("SIGTERM", quit);
  process.on("SIGUSR2", quit);

  if (routes.log) {
    app.addHook("onReady", logRoutes);
  }

  return app;
}
