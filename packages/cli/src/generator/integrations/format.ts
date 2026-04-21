import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../templates/index.js";
import { manifest } from "#/config/pkg.js";
import * as pm from "#/pm/index.js";

const PRETTIER_PACKAGES = ["prettier"];
const CONFIG_FILE = "prettier.config.js";
const IGNORE_FILE = ".prettierignore";
const IGNORE_CONTENT = ["dist", "node_modules"].join("\n") + "\n";

function handle({ args }: { args: { install: boolean } }) {
  if (exists(CONFIG_FILE)) {
    logger.fatal(`${CONFIG_FILE} already exists`);
  }

  const hasIgnoreFile = exists(IGNORE_FILE);

  if (args.install) {
    pm.add(PRETTIER_PACKAGES, { dev: true });
  }

  text.write.sync(CONFIG_FILE, templates.configs.prettier());

  if (!hasIgnoreFile) {
    text.write.sync(IGNORE_FILE, IGNORE_CONTENT);
  }

  const info = manifest.sync();
  info.scripts ??= {};
  if (!info.scripts["format"]) {
    info.scripts["format"] = "prettier . --write";
  }
  if (!info.scripts["format:check"]) {
    info.scripts["format:check"] = "prettier . --check";
  }
  manifest.write.sync(info);

  logger.info(
    "",
    `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan(CONFIG_FILE))}`,
    `  ${chalk.green("✔")} ${hasIgnoreFile ? "Verified" : "Created"} ${chalk.bold(chalk.cyan(IGNORE_FILE))}`,
    `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan("format"))} script to ${chalk.bold("package.json")}`,
    `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan("format:check"))} script to ${chalk.bold("package.json")}`,
    "",
    `  ${chalk.dim("Tool:")} integrated ${chalk.cyan("Prettier")} for code formatting`,
    `  ${chalk.dim("Tip:")} run ${chalk.cyan(`${pm.detect()} run format`)} to format your project`,
    ""
  );
}

export const format = defineCommand({
  meta: { name: "format", description: "Scaffold code formatting with Prettier" },
  args: {
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
  },
  run: handle,
});
