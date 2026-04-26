import { join } from "node:path";
import { defineCommand } from "citty";
import chalk from "chalk";
import { runtime } from "../runtime/index.js";
import { exists, json } from "#/utils/fs.js";
import { loadConfig } from "../config/index.js";
import { logger } from "#/utils/logger.js";
import * as pm from "../pm/index.js";

type Row = [label: string, value: string];

function table(title: string, rows: Row[]): string[] {
  const width = Math.max(...rows.map(([label]) => label.length)) + 2;
  return [
    `  ${chalk.bold(title)}`,
    `  ${chalk.dim("─".repeat(40))}`,
    ...rows.map(([label, value]) => `  ${chalk.dim(label.padEnd(width))}${value}`),
  ];
}

export const infoCommand = defineCommand({
  meta: {
    name: "info",
    description: "Show project configuration and discovered modules",
  },
  run() {
    return printInfo();
  },
});

export async function printInfo(): Promise<void> {
  const config = await loadConfig();

  let pkgName = "unknown";
  let pkgVersion = "—";
  const pkgPath = join(process.cwd(), "package.json");
  if (exists(pkgPath)) {
    const pkg = json.sync<{ name?: string; version?: string }>(pkgPath);
    pkgName = pkg.name ?? pkgName;
    pkgVersion = pkg.version ?? pkgVersion;
  }

  logger.info(
    "",
    ...table("Project", [
      ["Name", chalk.bold(pkgName)],
      ["Version", pkgVersion],
      ["Runtime", chalk.cyan(runtime.detect())],
      ["Package Manager", chalk.cyan(pm.detect())],
    ]),
    "",
    ...table("Build", [
      ["Entry", chalk.cyan(config.entry.join(", "))],
      ["Output", chalk.cyan(config.outdir)],
      ["TypeScript", chalk.cyan(config.tsconfig)],
      ...(config.target ? [["Target", chalk.cyan(config.target)] as Row] : []),
      ["Minify", config.minify ? chalk.green("yes") : chalk.dim("no")],
      ["Sourcemap", config.sourcemap ? chalk.green("yes") : chalk.dim("no")],
    ]),
    ""
  );
}
