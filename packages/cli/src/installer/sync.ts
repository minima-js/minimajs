import { defineCommand } from "citty";
import chalk from "chalk";
import { pkgm } from "../pkgm/index.js";
import { logger } from "#/utils/logger.js";

export const syncCommand = defineCommand({
  meta: {
    name: "sync",
    description: "Install all dependencies from the lockfile",
  },
  args: {
    frozen: {
      type: "boolean",
      default: true,
      negativeDescription: "Allow lockfile updates",
    },
  },
  run({ args }) {
    const manager = pkgm();
    logger.info(`  Syncing dependencies with ${chalk.bold(manager)}...`);
    pkgm.install({ manager, frozen: args.frozen });
  },
});
