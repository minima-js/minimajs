import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "../utils/fs.js";
import { logger } from "../utils/logger.js";
import { templates } from "../creator/templates/index.js";
import { runtime } from "../runtime/index.js";

function handle() {
  const rt = runtime.detect();
  const configFile = `minimajs.config.${rt === "bun" ? "ts" : "js"}`;
  const created: string[] = [];

  if (exists("tsconfig.json")) {
    logger.warn("tsconfig.json already exists, skipping");
  } else {
    text.write.sync("tsconfig.json", templates.tsconfig({}));
    created.push("tsconfig.json");
  }

  if (exists(configFile)) {
    logger.warn(`${configFile} already exists, skipping`);
  } else {
    text.write.sync(configFile, templates.minimaJsConfig({ runtime: rt }));
    created.push(configFile);
  }

  if (created.length === 0) {
    logger.warn("Nothing to do — all files already exist");
    return;
  }

  logger.info("", ...created.map((f) => `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan(f))}`), "");
}

export const initCommand = defineCommand({
  meta: { name: "init", description: "Scaffold tsconfig.json and minimajs.config in the current directory" },
  run: handle,
});
