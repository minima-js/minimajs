import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { bold, cyan, green, dim, yellow } from "../utils/colors.js";
import { text } from "../utils/fs.js";
import * as pm from "../pm/index.js";
import { fileURLToPath } from "node:url";
import { stubs } from "./stubs.js";

export { addIntegration } from "./integrations/index.js";
export type { Integration } from "./integrations/index.js";

export interface GenerateModuleOptions {
  name: string;
  dir?: string;
}

export function generateModule({ name, dir = "src" }: GenerateModuleOptions): void {
  const modulePath = resolve(dir, name);
  const moduleName = name.split("/").at(-1) ?? name;

  if (existsSync(join(modulePath, "module.ts"))) {
    process.stderr.write(`  Module ${bold(name)} already exists at ${cyan(modulePath)}\n`);
    process.exit(1);
  }

  const pascal = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const vars = { Name: pascal, name: moduleName };

  mkdirSync(modulePath, { recursive: true });
  text.write(join(modulePath, "module.ts"), stubs["module"](vars));
  text.write(join(modulePath, "handlers.ts"), stubs["handlers"](vars));

  process.stdout.write(
    [
      "",
      `  ${green("✔")} Generated module ${bold(cyan(name))}`,
      "",
      `  ${dim("Created:")}`,
      `    ${cyan(join(dir, name, "module.ts"))}`,
      `    ${cyan(join(dir, name, "handlers.ts"))}`,
      "",
    ].join("\n")
  );
}

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
