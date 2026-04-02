import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { bold, cyan, green, dim } from "../utils/colors.js";
import { text, mkdir } from "../utils/fs.js";
import { stubs } from "./stubs.js";

export type GeneratorType = "service" | "middleware" | "plugin" | "hook" | "job" | "cron" | "event";

function toPascal(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase()).replace(/^./, (c) => c.toUpperCase());
}

function toCamel(name: string): string {
  const base = name.split("/").at(-1) ?? name;
  return base.replace(/-([a-z])/g, (_, c: string) => (c as string).toUpperCase());
}

export function generateFile(type: GeneratorType, name: string, dir = "src"): void {
  const targetDir = resolve(dir, name);
  const filePath = join(targetDir, `${type}.ts`);

  if (existsSync(filePath)) {
    process.stderr.write(`  ${type} ${bold(name)} already exists at ${cyan(filePath)}\n`);
    process.exit(1);
  }

  const pascal = toPascal(name);
  const camel = toCamel(name);
  const content = stubs[type]({
    Name: pascal,
    name: camel,
    instance: camel + type.charAt(0).toUpperCase() + type.slice(1),
  });

  mkdir.sync(targetDir);
  text.write(filePath, content);

  process.stdout.write(
    [
      "",
      `  ${green("✔")} Generated ${type} ${bold(cyan(name))}`,
      "",
      `  ${dim("Created:")}`,
      `    ${cyan(join(dir, name, `${type}.ts`))}`,
      "",
    ].join("\n")
  );
}
