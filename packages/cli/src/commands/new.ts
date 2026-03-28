import { defineCommand } from "citty";
import { join } from "node:path";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import ora from "ora";
import { bold, cyan, green, dim } from "../utils/colors.js";
import { projectPackageJson, tsConfig, indexTs, rootModuleTs } from "../templates/project.js";

function write(filePath: string, content: string): void {
  writeFileSync(filePath, content, "utf8");
}

function detectPackageManager(): "bun" | "pnpm" | "yarn" | "npm" {
  // 1. Read packageManager field from nearest package.json (corepack standard)
  try {
    const pkgPath = join(process.cwd(), "package.json");
    const { packageManager } = JSON.parse(readFileSync(pkgPath, "utf8")) as { packageManager?: string };
    if (packageManager) {
      const name = packageManager.split("@")[0] as "bun" | "pnpm" | "yarn" | "npm";
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

function detectRuntime(): "bun" | "node" {
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

export const newCommand = defineCommand({
  meta: {
    name: "new",
    description: "Scaffold a new MinimaJS application",
  },
  args: {
    name: {
      type: "positional",
      description: "Project name / directory",
      required: true,
    },
    pm: {
      type: "string",
      description: "Package manager to use",
      valueHint: "bun|pnpm|yarn|npm",
    },
    runtime: {
      type: "string",
      description: "Runtime target",
      valueHint: "node|bun",
    },
    "skip-install": {
      type: "boolean",
      description: "Skip dependency installation",
    },
    git: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip git init",
    },
  },
  async run({ args }) {
    const name = args.name;
    const cwd = join(process.cwd(), name);
    const pm = (args.pm as "bun" | "pnpm" | "yarn" | "npm") ?? detectPackageManager();
    const runtime = (args.runtime as "node" | "bun") ?? detectRuntime();

    if (existsSync(cwd)) {
      process.stderr.write(`Directory ${bold(name)} already exists.\n`);
      process.exit(1);
    }

    const spinner = ora();

    // ── Create directory structure
    spinner.start(`Scaffolding ${bold(cyan(name))}...`);

    mkdirSync(join(cwd, "src"), { recursive: true });

    // package.json
    const pkg = projectPackageJson(name);
    if (runtime === "bun") {
      pkg.devDependencies = { ...pkg.devDependencies, "@types/bun": "latest" };
      delete pkg.engines;
    }
    write(join(cwd, "package.json"), JSON.stringify(pkg, null, 2) + "\n");

    // tsconfig.json
    write(join(cwd, "tsconfig.json"), JSON.stringify(tsConfig, null, 2) + "\n");

    // src/index.ts
    write(join(cwd, "src", "index.ts"), indexTs(runtime));

    // src/module.ts
    write(join(cwd, "src", "module.ts"), rootModuleTs);

    // .gitignore
    write(join(cwd, ".gitignore"), "node_modules\ndist\n*.tsbuildinfo\n.env\n");

    // .env
    write(join(cwd, ".env"), "PORT=3000\n");

    spinner.succeed(`Scaffolded ${bold(cyan(name))}`);

    // ── Git init
    if (args.git) {
      try {
        execSync("git init", { cwd, stdio: "ignore" });
        execSync("git add -A", { cwd, stdio: "ignore" });
        execSync('git commit -m "chore: initial commit"', { cwd, stdio: "ignore" });
      } catch {
        // git not available, skip
      }
    }

    // ── Install dependencies
    if (!args["skip-install"]) {
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
  },
});
