import { pino } from "pino";
import pretty from "pino-pretty";
import { getContextOrNull as getContext } from "./context.js";
import type { App, Dict } from "./types.js";
import { kPluginNameChain, kRequestContext } from "./internal/symbol.js";

const stream = pretty.default({
  colorize: true,
  ignore: "time,hostname",
});

function getPluginNames(server: App): string[] {
  return server[kPluginNameChain] ?? [];
}
function getHandler(req: any) {
  return req[kRequestContext]?.handler.name.replace("bound ", "");
}

const kModuleName = Symbol("module name");

function getModuleName() {
  const ctx = getContext();
  if (!ctx) {
    return null;
  }
  const { req, local } = ctx;
  if (!local.has(kModuleName)) {
    let name = getPluginNames(req.server).join("/");
    const handler = getHandler(req);
    if (handler) {
      name = name + ":" + handler;
    }
    local.set(kModuleName, name);
  }
  return local.get(kModuleName);
}

function mixin(data: Dict<any>) {
  const name = getModuleName();
  if (!name || data.name) {
    return data;
  }
  data.name = name;
  return data;
}

export const logger = pino({ mixin }, stream);
