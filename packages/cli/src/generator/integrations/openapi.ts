import { defineCommand } from "citty";
import chalk from "chalk";
import { logger } from "#/utils/logger.js";
import { suggestModule, applyPatch } from "../patch.js";
import * as pm from "#/pm/index.js";

export function integrateOpenapi(cwd: string, install: boolean): void {
  if (install) {
    pm.add(["@minimajs/openapi"], { skipInstalled: true });
  }

  const suggestion = suggestModule(cwd, {
    from: "@minimajs/openapi",
    imported: "openapi",
    plugin: `openapi({ info: { title: "My API", version: "1.0.0" } })`,
  });

  if (suggestion) {
    applyPatch(suggestion);
    logger.info(`  ${chalk.green("✔")} Configured openapi`);
  }
}

function handle({ args }: { args: { install: boolean } }) {
  integrateOpenapi(process.cwd(), args.install);
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
