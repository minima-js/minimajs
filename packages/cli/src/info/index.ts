import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { bold, cyan, dim, green } from "../utils/colors.js";
import { loadConfig } from "../config/index.js";

function row(label: string, value: string, width = 18): string {
  return `  ${dim(label.padEnd(width))}${value}\n`;
}

function section(title: string): string {
  return `\n  ${bold(title)}\n  ${dim("─".repeat(40))}\n`;
}

export async function printInfo(): Promise<void> {
  const config = await loadConfig();

  let pkgName = "unknown";
  let pkgVersion = "—";
  const pkgPath = join(process.cwd(), "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string; version?: string };
    pkgName = pkg.name ?? pkgName;
    pkgVersion = pkg.version ?? pkgVersion;
  }

  process.stdout.write("\n");
  process.stdout.write(section("Project"));
  process.stdout.write(row("Name", bold(pkgName)));
  process.stdout.write(row("Version", pkgVersion));
  process.stdout.write(row("Runtime", cyan(config.runtime ?? "node")));
  process.stdout.write(row("Package Manager", cyan(config.packageManager ?? "auto-detect")));

  process.stdout.write(section("Build"));
  process.stdout.write(row("Entry", cyan(config.entry.join(", "))));
  process.stdout.write(row("Output", cyan(config.outdir)));
  process.stdout.write(row("TypeScript", cyan(config.tsconfig)));
  if (config.target) process.stdout.write(row("Target", cyan(config.target)));
  process.stdout.write(row("Minify", config.minify ? green("yes") : dim("no")));
  process.stdout.write(row("Sourcemap", config.sourcemap ? green("yes") : dim("no")));

  process.stdout.write("\n");
}
