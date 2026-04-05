import { join } from "node:path";
import chalk from "chalk";
import { runtime } from "../runtime/index.js";
import { exists, json } from "../utils/fs.js";
import { loadConfig } from "../config/index.js";
import * as pm from "../pm/index.js";

function row(label: string, value: string, width = 18): string {
  return `  ${chalk.dim(label.padEnd(width))}${value}\n`;
}

function section(title: string): string {
  return `\n  ${chalk.bold(title)}\n  ${chalk.dim("─".repeat(40))}\n`;
}

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

  process.stdout.write("\n");
  process.stdout.write(section("Project"));
  process.stdout.write(row("Name", chalk.bold(pkgName)));
  process.stdout.write(row("Version", pkgVersion));
  process.stdout.write(row("Runtime", chalk.cyan(runtime.detect())));
  process.stdout.write(row("Package Manager", chalk.cyan(pm.detect())));

  process.stdout.write(section("Build"));
  process.stdout.write(row("Entry", chalk.cyan(config.entry.join(", "))));
  process.stdout.write(row("Output", chalk.cyan(config.outdir)));
  process.stdout.write(row("TypeScript", chalk.cyan(config.tsconfig)));
  if (config.target) process.stdout.write(row("Target", chalk.cyan(config.target)));
  process.stdout.write(row("Minify", config.minify ? chalk.green("yes") : chalk.dim("no")));
  process.stdout.write(row("Sourcemap", config.sourcemap ? chalk.green("yes") : chalk.dim("no")));

  process.stdout.write("\n");
}
