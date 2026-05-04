import { defineCommand } from "citty";
import { join } from "node:path";
import chalk from "chalk";
import { exists, text } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../templates/index.js";
import { manifest } from "#/manifest/index.js";
import { pkgm } from "#/pkgm/index.js";

const TEST_PACKAGES = ["jest", "@jest/globals", "esbuild"];
const CONFIG_FILE = "jest.config.js";
const TRANSFORM_FILE = "jest.transform.js";

function testScript(berry: boolean): string {
  const base = berry
    ? "yarn node --no-warnings --experimental-vm-modules $(yarn bin jest)"
    : "node --no-warnings --experimental-vm-modules node_modules/.bin/jest";
  return base;
}

function handle({ args }: { args: { install: boolean; example: boolean } }) {
  const berry = pkgm() === "yarn" && pkgm.isYarnBerry();
  const script = testScript(berry);
  if (exists(CONFIG_FILE)) {
    logger.fatal(`${CONFIG_FILE} already exists`);
  }

  if (args.install) {
    pkgm.add(TEST_PACKAGES, { dev: true });
  }

  text.write.sync(CONFIG_FILE, templates.tests.config());
  text.write.sync(TRANSFORM_FILE, templates.tests.transform());

  if (args.example) {
    text.write.sync(join("src", "__tests__", "example.test.ts"), templates.tests.example(), { ensuredir: true });
  }

  const info = manifest.sync();
  info.scripts ??= {};
  let scriptsChanged = false;
  if (!info.scripts["test"]) {
    info.scripts["test"] = script;
    scriptsChanged = true;
  }
  if (!info.scripts["test:watch"]) {
    info.scripts["test:watch"] = `${script} --watch`;
    scriptsChanged = true;
  }
  if (!info.scripts["test:coverage"]) {
    info.scripts["test:coverage"] = `${script} --coverage`;
    scriptsChanged = true;
  }
  if (scriptsChanged) manifest.write.sync(info);

  logger.info(
    "",
    `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan(CONFIG_FILE))}`,
    `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan(TRANSFORM_FILE))}`,
    ...(args.example ? [`  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan("src/__tests__/example.test.ts"))}`] : []),
    `  ${chalk.green("✔")} Added test scripts to ${chalk.bold("package.json")}`,
    "",
    `  ${chalk.dim("Tip:")} run ${chalk.cyan(`${pkgm()} run test`)} to run your tests`,
    ""
  );
}

export const test = defineCommand({
  meta: { name: "test", description: "Scaffold Jest with esbuild transform for TypeScript" },
  args: {
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
    example: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip example test file",
    },
  },
  run: handle,
});
