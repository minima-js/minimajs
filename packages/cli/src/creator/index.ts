import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { bold, cyan, green, dim } from "../utils/colors.js";
import { createSpinner } from "../utils/spinner.js";
import { projectPackageJson, tsConfig, indexTs, rootModuleTs } from "../templates/project.js";

export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";
export type Runtime = "bun" | "node";

export interface CreateProjectOptions {
  name: string;
  pm?: PackageManager;
  runtime?: Runtime;
  skipInstall?: boolean;
  git?: boolean;
}

function write(filePath: string, content: string): void {
  writeFileSync(filePath, content, "utf8");
}

export function detectPackageManager(): PackageManager {
  // 1. Read packageManager field from nearest package.json (corepack standard)
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const { packageManager } = JSON.parse(readFileSync(pkgPath, "utf8")) as { packageManager?: string };
    if (packageManager) {
      const name = packageManager.split("@")[0] as PackageManager;
      if (["bun", "pnpm", "yarn", "npm"].includes(name)) return name;
    }
  } catch {
    // no package.json or no field
  }

  // 2. Fall back to binary detection
  for (const pm of ["bun", "pnpm", "yarn"] as const) {
    try {
      execSync(`${pm} --version`, { stdio: "ignore" });
      return pm;
    } catch {
      // not available
    }
  }
  return "npm";
}

export function detectRuntime(): Runtime {
  // Running inside Bun runtime
  if (typeof process.versions.bun === "string") return "bun";
  // Bun binary available on PATH
  try {
    execSync("bun --version", { stdio: "ignore" });
    return "bun";
  } catch {
    // not available
  }
  return "node";
}

export function createProject(opts: CreateProjectOptions): void {
  const { name, skipInstall = false, git = true } = opts;
  const pm = opts.pm ?? detectPackageManager();
  const runtime = opts.runtime ?? detectRuntime();
  const cwd = join(process.cwd(), name);

  if (existsSync(cwd)) {
    process.stderr.write(`Directory ${bold(name)} already exists.\n`);
    process.exit(1);
  }

  const spinner = createSpinner();

  // ── Create directory structure
  spinner.start(`Scaffolding ${bold(cyan(name))}...`);

  mkdirSync(join(cwd, "src"), { recursive: true });

  const pkg = projectPackageJson(name);
  if (runtime === "bun") {
    pkg.devDependencies = { ...pkg.devDependencies, "@types/bun": "latest" };
    delete pkg.engines;
  }
  write(join(cwd, "package.json"), JSON.stringify(pkg, null, 2) + "\n");
  write(join(cwd, "tsconfig.json"), JSON.stringify(tsConfig, null, 2) + "\n");
  write(join(cwd, "src", "index.ts"), indexTs(runtime));
  write(join(cwd, "src", "module.ts"), rootModuleTs);
  write(join(cwd, ".gitignore"), "node_modules\ndist\n*.tsbuildinfo\n.env\n");
  write(join(cwd, ".env"), "PORT=3000\n");

  spinner.succeed(`Scaffolded ${bold(cyan(name))}`);

  // ── Git init
  if (git) {
    try {
      execSync("git init", { cwd, stdio: "ignore" });
      execSync("git add -A", { cwd, stdio: "ignore" });
      execSync('git commit -m "chore: initial commit"', { cwd, stdio: "ignore" });
    } catch {
      // git not available, skip silently
    }
  }

  // ── Install dependencies
  if (!skipInstall) {
    spinner.start(`Installing dependencies with ${bold(pm)}...`);
    try {
      execSync(`${pm} install`, { cwd, stdio: "ignore" });
      spinner.succeed("Dependencies installed");
    } catch {
      spinner.fail(`Failed to install with ${pm}. Run ${bold(`${pm} install`)} manually.`);
    }
  }

  // ── Done
  process.stdout.write(
    [
      "",
      `  ${green("✔")} Project created at ${bold(cyan(`./${name}`))}`,
      "",
      `  ${dim("Next steps:")}`,
      `    ${cyan(`cd ${name}`)}`,
      `    ${cyan(`${pm} run dev`)}`,
      "",
    ].join("\n")
  );
}
