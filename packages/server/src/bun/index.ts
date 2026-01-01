import type { Logger } from "pino";
import pino from "pino";
import merge from "deepmerge";
import Router, { type HTTPVersion } from "find-my-way";
import { Server, type BunServerOptions } from "./server.js";
import { minimajs } from "../plugins/minimajs.js";

const loggerOptions = {
  level: "info",
};

const logger = pino(loggerOptions);

export interface BunAppOptions extends Omit<BunServerOptions, "router" | "logger"> {
  logger?: Logger | boolean;
  router?: Router.Instance<HTTPVersion.V1> | Router.Config<HTTPVersion.V1>;
}

function getDefaultConfig({ logger: loggerOverride }: BunAppOptions): Logger {
  let loggerConfig = loggerOptions;

  if (loggerOverride === false) {
    return logger.child({ enabled: false });
  }

  if (loggerOverride && loggerOverride !== true) {
    loggerConfig = merge(loggerOptions, loggerOverride as any);
  }

  return logger.child(loggerConfig);
}

export function createApp(opts: BunAppOptions = {}) {
  const appLogger = getDefaultConfig(opts);
  const { prefix, router: routerOption } = opts;
  const router =
    routerOption && typeof routerOption === "object" && "on" in routerOption
      ? routerOption
      : Router((routerOption as Router.Config<HTTPVersion.V1> | undefined) || { ignoreTrailingSlash: true });
  const app = new Server({ logger: appLogger, prefix, router });
  app.register(minimajs());
  return app;
}
