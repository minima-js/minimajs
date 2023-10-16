import type { Server } from "node:http";
import fastify, { type FastifyInstance } from "fastify";
import { appPlugin } from "./fastify/plugins.js";
import { errorHandler } from "./error.js";
import chalk from "chalk";
import type { AppOptions } from "./types.js";
export * from "./types.js";
export * from "./logger.js";
export * from "./module.js";
export * from "./http.js";
export { createContext } from "./context.js";
export { onSent } from "./hooks.js";

function getDefaultConfig(): AppOptions {
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
  };
}

export function createApp({
  routes = { log: true },
  ...opts
}: AppOptions = {}): FastifyInstance {
  const app = fastify<Server>({
    ...getDefaultConfig(),
    ...opts,
  });

  app.register(appPlugin);
  app.setErrorHandler(errorHandler);

  async function quit(sig: string) {
    app.log.info(`${sig}: %s`, "closing server");
    await app.close();
    app.log.info("finished all requests");
  }

  process.on("SIGTERM", quit);
  process.on("SIGUSR2", quit);

  if (routes.log) {
    app.addHook("onReady", () => {
      console.log(
        chalk.magenta(
          app.printRoutes({
            commonPrefix: false,
          })
        )
      );
    });
  }
  return app;
}
