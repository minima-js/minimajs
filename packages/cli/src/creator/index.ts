import { join } from "node:path";
import { mkdirSync, existsSync } from "node:fs";
import { bold, cyan, green, dim } from "../utils/colors.js";
import { createSpinner } from "../utils/spinner.js";
import {
  renderIndex,
  renderRootModule,
  renderMinimaJsConfig,
  renderTsConfig,
  renderPackageJson,
  renderGitignore,
  renderEnv,
} from "./stubs.js";
import type { Runtime } from "../config/types.js";
import * as pm from "../pm/index.js";
import { exec, execSafe } from "../exec/index.js";
import { write } from "../utils/fs.js";

export type { Runtime };
export type { PM as PackageManager } from "../pm/index.js";

export interface CreateProjectOptions {
  name: string;
  pm?: pm.PM;
  runtime?: Runtime;
  skipInstall?: boolean;
  git?: boolean;
}

export function detectPackageManager(): pm.PM {
  return pm.detect();
}

export function detectRuntime(): Runtime {
  if (typeof process.versions.bun === "string") return "bun";
  if (execSafe("bun", ["--version"], { stdio: ["ignore", "ignore", "ignore"] }).ok) return "bun";
  return "node";
}

export function createProject(opts: CreateProjectOptions): void {
  const { name, skipInstall = false, git = true } = opts;
  const manager = opts.pm ?? pm.detect();
  const runtime = opts.runtime ?? detectRuntime();
  const cwd = join(process.cwd(), name);

  if (existsSync(cwd)) {
    process.stderr.write(`Directory ${bold(name)} already exists.\n`);
    process.exit(1);
  }

  // Resolve exact installed version for the corepack `packageManager` field.
  // This is safe to skip if the PM binary isn't available (returns null).
  const packageManagerField = pm.getVersion(manager);

  const spinner = createSpinner();

  spinner.start(`Scaffolding ${bold(cyan(name))}...`);

  mkdirSync(join(cwd, "src"), { recursive: true });

  write(join(cwd, "package.json"), renderPackageJson(name, runtime, packageManagerField));
  write(join(cwd, "tsconfig.json"), renderTsConfig());
  write(join(cwd, "minimajs.config.ts"), renderMinimaJsConfig(runtime));
  write(join(cwd, "src", "index.ts"), renderIndex(runtime));
  write(join(cwd, "src", "module.ts"), renderRootModule());
  write(join(cwd, ".gitignore"), renderGitignore());
  write(join(cwd, ".env"), renderEnv());

  spinner.succeed(`Scaffolded ${bold(cyan(name))}`);

  if (git) {
    execSafe("git", ["init"], { cwd });
    execSafe("git", ["add", "-A"], { cwd });
    execSafe("git", ["commit", "-m", "chore: initial commit"], { cwd });
  }

  if (!skipInstall) {
    spinner.start(`Installing dependencies with ${bold(manager)}...`);
    try {
      exec(manager, ["install"], { cwd });
      spinner.succeed("Dependencies installed");
    } catch {
      spinner.fail(`Failed to install. Run ${bold(`${manager} install`)} manually.`);
    }
  }

  process.stdout.write(
    [
      "",
      `  ${green("✔")} Project created at ${bold(cyan(`./${name}`))}`,
      "",
      `  ${dim("Next steps:")}`,
      `    ${cyan(`cd ${name}`)}`,
      `    ${cyan(`${manager} run dev`)}`,
      "",
      `  ${dim("Tip: use")} ${cyan(`${manager} run app`)} ${dim("as a shortcut for")} ${cyan("minimajs")}`,
      `    ${dim("e.g.")} ${cyan(`${manager} run app add module users`)}`,
      "",
    ].join("\n")
  );
}
