import { join, resolve } from "node:path";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { green, bold, cyan, dim } from "../utils/colors.js";
import { stubs } from "../adder/stubs.js";

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

  const pascal = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const content = stubs["module"]({ Name: pascal, name: moduleName });

  mkdirSync(modulePath, { recursive: true });
  writeFileSync(join(modulePath, "module.ts"), content, "utf8");

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
