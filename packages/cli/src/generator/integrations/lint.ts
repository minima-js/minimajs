import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "../../utils/fs.js";
import { logger } from "../../utils/logger.js";
import { templates } from "../templates/index.js";
import { manifest } from "../../config/pkg.js";
import * as pm from "../../pm/index.js";

const ESLINT_PACKAGES = ["eslint", "@eslint/js", "typescript-eslint"];
const CONFIG_FILE = "eslint.config.js";

async function handle() {
  if (exists(CONFIG_FILE)) {
    logger.fatal(`${CONFIG_FILE} already exists`);
  }

  pm.add(ESLINT_PACKAGES, { dev: true });

  text.write.sync(CONFIG_FILE, templates.configs.eslint());

  const info = await manifest();
  info.scripts ??= {};
  if (!info.scripts["lint"]) {
    info.scripts["lint"] = "eslint .";
    await manifest.write(info);
  }

  logger.info(
    "",
    `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan(CONFIG_FILE))}`,
    `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan("lint"))} script to ${chalk.bold("package.json")}`,
    "",
    `  ${chalk.dim("Tip:")} run ${chalk.cyan(`${pm.detect()} run lint`)} to lint your project`,
    ""
  );
}

export const lint = defineCommand({
  meta: { name: "lint", description: "Scaffold ESLint with TypeScript support" },
  run: handle,
});
