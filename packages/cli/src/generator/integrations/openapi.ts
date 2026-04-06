import { defineCommand } from "citty";
import chalk from "chalk";
import { withSpinner } from "../../utils/spinner.js";
import { logger } from "../../utils/logger.js";
import { patchModule } from "../patch.js";
import * as pm from "../../pm/index.js";

export const openapi = defineCommand({
  meta: { name: "openapi", description: "Install OpenAPI/Swagger documentation" },
  async run() {
    await withSpinner(`Installing ${chalk.bold("@minimajs/openapi")}...`, () => pm.add(["@minimajs/openapi"])).catch(() => {
      process.stderr.write(`  Run ${chalk.bold(`${pm.detect()} add @minimajs/openapi`)} manually\n`);
    });

    await patchModule(
      process.cwd(),
      `import { openapi } from "@minimajs/openapi";`,
      `openapi({ info: { title: "My API", version: "1.0.0" } })`
    );

    logger.info("", `  ${chalk.green("✔")} Added ${chalk.bold(chalk.cyan("openapi"))} — OpenAPI/Swagger documentation`, "");
  },
});
