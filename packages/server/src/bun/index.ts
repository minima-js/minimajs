import type { Logger } from "pino";
import pino from "pino";
import merge from "deepmerge";
import { BunServer, type BunServerOptions } from "./server.js";
import type { App } from "../interfaces/app.js";

// TODO: Port these from the shared code
// export * from "../interceptor.js";
// export * from "../http.js";
// export * from "../hooks/index.js";
// export * from "../context.js";

export * from "../interfaces/index.js";

const loggerOptions = {
  level: "info",
};

const logger = pino(loggerOptions);

export interface BunAppOptions extends BunServerOptions {
  logger?: Logger | boolean;
  disableRequestLogging?: boolean;
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

export function createApp(opts: BunAppOptions = {}): App {
  const appLogger = getDefaultConfig(opts);
  const { prefix } = opts;
  const app = new BunServer(appLogger, { prefix }) as App;
  // TODO: Register minimajs plugin once ported
  // app.register(minimajs, {});
  return app;
}
