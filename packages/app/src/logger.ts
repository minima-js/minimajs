import { pino } from "pino";
import pretty from "pino-pretty";
import { getContext } from "./context.js";
import type { App, Dict } from "./types.js";
import { kPluginNameChain } from "./fastify/symbol.js";

const stream = pretty.default({
  colorize: true,
  ignore: "time,hostname",
});

function getPluginNames(server: App): string[] {
  return server[kPluginNameChain] ?? [];
}

function getModuleName() {
  const ctx = getContext();
  if (!ctx) {
    return null;
  }
  const { req } = ctx;
  return getPluginNames(req.server).join("/");
}

function withModuleName(data: Dict<any>) {
  const name = getModuleName();
  if (!name || data.name) {
    return data;
  }
  data.name = name;
  return data;
}

export const log = pino(
  {
    mixin: withModuleName,
  },
  stream
);
