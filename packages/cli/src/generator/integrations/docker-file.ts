import { defineCommand } from "citty";
import { join } from "node:path";
import { bold, cyan, green, dim, yellow } from "../../utils/colors.js";
import { exists, text } from "../../utils/fs.js";
import { print } from "../../utils/logging.js";
import { dockerTemplates } from "../templates/index.js";
import * as pm from "../../pm/index.js";

function handle() {
  const detected = pm.detect();
  const berry = detected === "yarn" && pm.isYarnBerry();
  const destPath = join(process.cwd(), "Dockerfile");

  if (exists(destPath)) {
    process.stderr.write(`  ${yellow("!")} Dockerfile already exists\n`);
    process.exit(1);
  }

  const content = berry ? dockerTemplates.berry({}) : dockerTemplates[detected]({});
  text.write(destPath, content);

  const label = berry ? "yarn berry" : detected;
  print(
    "",
    `  ${green("✔")} Created ${bold(cyan("Dockerfile"))} for ${bold(label)}`,
    "",
    `  ${dim("Tip:")} build with ${cyan("docker build -t my-app .")}`,
    ""
  );
}

export const dockerfile = defineCommand({
  meta: { name: "dockerfile", description: "Generate a Dockerfile (auto-detects bun or node runtime)" },
  run: handle,
});
