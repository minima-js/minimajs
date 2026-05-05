import { defineCommand } from "citty";
import { logger } from "#/utils/logger.js";
import { upgradeCommand } from "./upgrade.js";

export const installerCommands = {
  update: upgradeCommand,

  sync: defineCommand({
    meta: {
      name: "sync",
      description: "Install all dependencies from the lockfile",
    },

    run() {
      logger.fatal("use ./app sync");
    },
  }),

  install: defineCommand({
    meta: {
      name: "install",
      alias: ["i"],
      description: "Install dependencies using your favorite package manager",
    },

    run() {
      logger.fatal("use ./app install");
    },
  }),

  uninstall: defineCommand({
    meta: {
      name: "uninstall",
      alias: ["un"],
      description: "Uninstall dependencies using your favorite package manager",
    },

    run() {
      logger.fatal("use ./app uninstall");
    },
  }),
};
