import { defineCommand } from "citty";
import { bold, cyan, green } from "../../utils/colors.js";
import { withSpinner } from "../../utils/spinner.js";
import { print } from "../../utils/logging.js";
import { patchModule } from "../patch.js";
import * as pm from "../../pm/index.js";

export const openapi = defineCommand({
  meta: { name: "openapi", description: "Install OpenAPI/Swagger documentation" },
  async run() {
    await withSpinner(`Installing ${bold("@minimajs/openapi")}...`, () => pm.add(["@minimajs/openapi"])).catch(() => {
      process.stderr.write(`  Run ${bold(`${pm.detect()} add @minimajs/openapi`)} manually\n`);
    });

    patchModule(
      process.cwd(),
      `import { openapi } from "@minimajs/openapi";`,
      `openapi({ info: { title: "My API", version: "1.0.0" } })`
    );

    print("", `  ${green("✔")} Added ${bold(cyan("openapi"))} — OpenAPI/Swagger documentation`, "");
  },
});
