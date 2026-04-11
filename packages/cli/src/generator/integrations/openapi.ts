import { defineCommand } from "citty";
import chalk from "chalk";
import { logger } from "#/utils/logger.js";
import { patchModule } from "../patch.js";
import * as pm from "#/pm/index.js";

async function handle({ args }: { args: { install: boolean } }) {
  if (args.install) {
    logger.info(`  Installing ${chalk.bold("@minimajs/openapi")}...`);
    pm.add(["@minimajs/openapi"], { skipInstalled: true });
  }

  patchModule(
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
