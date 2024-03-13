import type { Server } from "node:http";
import fastify from "fastify";
import { appPlugin } from "./internal/plugins.js";
import { NotFoundError, errorHandler } from "./error.js";
import chalk from "chalk";
import type { App, AppOptions } from "./types.js";
export * from "./types.js";
export * from "./logger.js";
export * from "./module.js";
export * from "./http.js";
export * from "./hooks.js";
export { createContext } from "./context.js";

function getDefaultConfig(override: AppOptions): AppOptions {
  return {
    trustProxy: true,
    disableRequestLogging: true,
    logger: {
      transport: {
        target: "pino-pretty",
        options: {
          ignore: "hostname,req.hostname,req.remoteAddress,time",
          singleLine: true,
          colorize: true,
        },
      },
    },
    ...override,
  };
}

export function createApp({ routes = { log: true }, ...opts }: AppOptions = {}): App {
  const app = fastify<Server>(getDefaultConfig(opts));
  app.register(appPlugin);
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler((req, res) => errorHandler(new NotFoundError(), req, res));

  app.addContentTypeParser("multipart/form-data", (_, __, next) => {
    next(null);
  });

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
