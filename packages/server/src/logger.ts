import { pino, type LoggerOptions } from "pino";
import merge from "deepmerge";
import { getContextOrNull as getContext } from "./context.js";
import type { App, Dict, Request } from "./types.js";
import { kPluginNameChain, kRequestContext } from "./internal/fastify.js";

export const loggerOptions: LoggerOptions = {
  transport: {
    target: "pino-pretty",
    options: {
      ignore: "hostname,pid",
      singleLine: true,
      colorize: true,
    },
  },
};

export function mixin(data: Dict<unknown>) {
  const name = getModuleName();
  if (!name || data.name) {
    return data;
  }
  data.name = name;
  return data;
}

function getPluginNames(server: App): string {
  const plugins = server[kPluginNameChain];
  if (!plugins) return "";
  return plugins[0] ?? "";
}
function getHandler(req: Request) {
  return (req as any)[kRequestContext]?.handler.name.replace("bound ", "");
}

const kModuleName = Symbol("module name");

function getModuleName() {
  const ctx = getContext();
  if (!ctx) {
    return null;
  }
  const { req, local } = ctx;
  if (!local.has(kModuleName)) {
    let name = getPluginNames(req.server);
    const handler = getHandler(req);
    if (handler) {
      name = name + ":" + handler;
    }
    local.set(kModuleName, name);
  }
  return local.get(kModuleName);
}

export function createLogger(option: LoggerOptions) {
  return pino(merge({ ...loggerOptions, mixin }, option));
}

export const logger = createLogger({});
