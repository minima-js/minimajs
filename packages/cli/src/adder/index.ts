import { existsSync } from "node:fs";
import { join } from "node:path";
import { bold, cyan, green, dim, yellow } from "../utils/colors.js";
import { text } from "../utils/fs.js";
import * as pm from "../pm/index.js";
import { fileURLToPath } from "node:url";

export { addIntegration } from "./integrations/index.js";
export type { Integration } from "./integrations/index.js";

const templatesDir = fileURLToPath(new URL("./templates", import.meta.url));

/** Map detected PM to the Dockerfile template filename */
const DOCKERFILE_TEMPLATE: Record<pm.PM, string> = {
  bun: "Dockerfile.bun",
  npm: "Dockerfile.node",
  pnpm: "Dockerfile.pnpm",
  yarn: "Dockerfile.yarn",
};

function readDockerfile(manager: pm.PM, berry: boolean): string {
  const template = manager === "yarn" && berry ? "Dockerfile.berry" : DOCKERFILE_TEMPLATE[manager];
  return text.read(join(templatesDir, template));
}

export function addDockerfile(): void {
  const detected = pm.detect();
  const berry = detected === "yarn" && pm.isYarnBerry();
  const destPath = join(process.cwd(), "Dockerfile");

  if (existsSync(destPath)) {
    process.stderr.write(`  ${yellow("!")} Dockerfile already exists\n`);
    process.exit(1);
  }

  text.write(destPath, readDockerfile(detected, berry));

  const label = berry ? "yarn berry" : detected;

  process.stdout.write(
    [
      "",
      `  ${green("✔")} Created ${bold(cyan("Dockerfile"))} for ${bold(label)}`,
      "",
      `  ${dim("Tip:")} build with ${cyan("docker build -t my-app .")}`,
      "",
    ].join("\n")
  );
}
