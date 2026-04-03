import { defineCommand } from "citty";
import { integrations } from "./integrations/index.js";

export const addCommand = defineCommand({
  meta: {
    name: "add",
    description: "Scaffold modules, services, middleware and install integrations",
  },
  subCommands: {
    ...integrations,
  },
});
