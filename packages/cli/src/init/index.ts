import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "../utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../creator/templates/index.js";
import { runtime } from "../runtime/index.js";
import * as pm from "../pm/index.js";

function handle() {
  const rt = runtime.detect();
  const manager = pm.detect();
  const configFile = `minimajs.config.${rt === "bun" ? "ts" : "js"}`;
  const appContent =
    rt === "bun"
      ? templates.app.bun()
      : templates.app.node({ exec: pm.EXEC[manager as Exclude<pm.PM, "bun">] ?? pm.EXEC.npm });

  const files = [
    { path: "app", content: appContent, mode: 0o755 },
    { path: "tsconfig.json", content: templates.tsconfig() },
    { path: configFile, content: templates.minimajsConfig({ runtime: rt }) },
  ];

  const created: string[] = [];

  for (const file of files) {
    if (exists(file.path)) {
      logger.warn(`${file.path} already exists, skipping`);
    } else {
      text.write.sync(file.path, file.content, { mode: file.mode });
      created.push(file.path);
    }
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
