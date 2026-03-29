import { join, resolve } from "node:path";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { moduleTs } from "../templates/module.js";
import { green, bold, cyan, dim } from "../utils/colors.js";

export interface GenerateModuleOptions {
  name: string;
  dir?: string;
}

export function generateModule({ name, dir = "src" }: GenerateModuleOptions): void {
  const modulePath = resolve(dir, name);
  const moduleName = name.split("/").at(-1) ?? name;

  if (existsSync(join(modulePath, "module.ts"))) {
    process.stderr.write(`Module ${bold(name)} already exists at ${cyan(modulePath)}\n`);
    process.exit(1);
  }

  mkdirSync(modulePath, { recursive: true });
  writeFileSync(join(modulePath, "module.ts"), moduleTs(moduleName), "utf8");

  process.stdout.write(
    [
      "",
      `  ${green("✔")} Generated module ${bold(cyan(name))}`,
      "",
      `  ${dim("Created:")}`,
      `    ${cyan(join(dir, name, "module.ts"))}`,
      "",
    ].join("\n")
  );
}
