import { defineCommand } from "citty";
import chalk from "chalk";
import { withSpinner } from "#/utils/spinner.js";
import { logger } from "#/utils/logger.js";
import { patchModule } from "../patch.js";
import * as pm from "#/pm/index.js";

async function handle({ args }: { args: { install: boolean } }) {
  if (args.install) {
    await withSpinner(`Installing ${chalk.bold("@minimajs/openapi")}...`, () => pm.add(["@minimajs/openapi"])).catch(() => {
      process.stderr.write(`  Run ${chalk.bold(`${pm.detect()} add @minimajs/openapi`)} manually\n`);
    });
  }

  await patchModule(
    process.cwd(),
    `import { openapi } from "@minimajs/openapi";`,
    `openapi({ info: { title: "My API", version: "1.0.0" } })`
  );

  logger.info("", `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan("openapi"))} — OpenAPI/Swagger documentation`, "");
}

export const openapi = defineCommand({
  meta: { name: "openapi", description: "Install OpenAPI/Swagger documentation" },
  args: {
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
  },
  run: handle,
});
