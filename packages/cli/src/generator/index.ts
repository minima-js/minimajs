import { defineCommand, type CommandDef } from "citty";
import { integrations } from "./integrations/index.js";

export function buildAddCommand(pluginGenerators: Record<string, CommandDef<any>> = {}) {
  return defineCommand({
    meta: {
      name: "add",
      description: "Scaffold modules, services, middleware and install integrations",
    },
    subCommands: { ...integrations, ...pluginGenerators },
  });
}
