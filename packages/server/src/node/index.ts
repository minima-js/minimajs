import type { Logger } from "pino";
import pino from "pino";
import merge from "deepmerge";
import Router, { type HTTPVersion } from "find-my-way";
import { Server, type NodeServerOptions } from "./server.js";
import { minimajs } from "../plugins/minimajs.js";

export * from "../interfaces/index.js";

const loggerOptions = {
  level: "info",
};

const logger = pino(loggerOptions);

export interface NodeAppOptions extends Omit<NodeServerOptions, "router" | "logger"> {
  logger?: Logger | boolean;
  disableRequestLogging?: boolean;
  router?: Router.Instance<HTTPVersion.V1> | Router.Config<HTTPVersion.V1>;
}

function getDefaultConfig({ logger: loggerOverride }: NodeAppOptions): Logger {
  let loggerConfig = loggerOptions;

  if (loggerOverride === false) {
    return logger.child({ enabled: false });
  }

  if (loggerOverride && loggerOverride !== true) {
    loggerConfig = merge(loggerOptions, loggerOverride as any);
  }

  return logger.child(loggerConfig);
}

export function createApp(opts: NodeAppOptions = {}) {
  const appLogger = getDefaultConfig(opts);
  const { prefix, router: routerOption } = opts;

  const router =
    routerOption && typeof routerOption === "object" && "on" in routerOption
      ? routerOption
      : Router((routerOption as Router.Config<HTTPVersion.V1> | undefined) || { ignoreTrailingSlash: true });

  const app = new Server({ prefix, logger: appLogger, router });
  app.register(minimajs());
  return app;
}
