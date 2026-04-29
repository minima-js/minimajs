import { defineCommand } from "citty";
import { join } from "node:path";
import { resolveCwd } from "#/utils/path.js";
import chalk from "chalk";
import { createSpinner } from "#/utils/spinner.js";
import { logger } from "#/utils/logger.js";
import { templates } from "./templates/index.js";
import type { Runtime } from "../config/types.js";
import * as pm from "../pm/index.js";
import { exec } from "../utils/exec.js";
import { exists, text, mkdir } from "../utils/fs.js";
import { runtime } from "../runtime/index.js";
import { EOL } from "node:os";

function resolveVersionFileValue(rt: Runtime): string {
  if (rt === "bun" && typeof process.versions.bun === "string") return process.versions.bun;
  if (rt === "node" && typeof process.versions.bun !== "string") return process.versions.node;

  try {
    return exec.capture.sync(rt, ["--version"]).stdout.replace(/^v/, "");
  } catch {
    return rt === "bun" ? "latest" : process.versions.node;
  }
}

function renderPackageJson(name: string, rt: Runtime, packageManager?: string | null): string {
  const stub = rt === "bun" ? templates.package.bun : templates.package.node;
  const raw = stub({ name, packageManager: packageManager ?? "" });
  if (!packageManager) return raw.replace(/\n\s+"packageManager": "",/, "");
  return raw;
}

interface NewArgs {
  name: string;
  pm?: string;
  runtime?: string;
  bun?: boolean;
  install: boolean;
  git: boolean;
}

interface ScaffoldFile {
  path: string;
  content: string;
  mode?: number;
}

function getScaffoldFiles({
  name,
  manager,
  packageManagerField,
  rt,
}: {
  name: string;
  manager: pm.PM;
  packageManagerField: string | null;
  rt: Runtime;
}): ScaffoldFile[] {
  const versionFile = rt === "bun" ? ".bun-version" : ".node-version";
  const appContent =
    rt === "bun"
      ? templates.app.bun()
      : templates.app.node({ exec: pm.EXEC[manager as Exclude<pm.PM, "bun">] ?? pm.EXEC.npm });

  return [
    { path: "package.json", content: renderPackageJson(name, rt, packageManagerField) },
    { path: "tsconfig.json", content: templates.tsconfig() },
    { path: `minimajs.config.${rt === "bun" ? "ts" : "js"}`, content: templates.minimajsConfig({ runtime: rt }) },
    { path: join("src", "index.ts"), content: templates.index({ runtime: rt }) },
    { path: join("src", "module.ts"), content: templates.rootModule() },
    { path: join("src", "users", "module.ts"), content: templates.usersModule() },
    { path: join("src", "users", "users.handler.ts"), content: templates.usersHandler() },
    { path: ".gitignore", content: templates.gitignore() },
    { path: ".env", content: templates.env() },
    { path: versionFile, content: resolveVersionFileValue(rt) + EOL },
    { path: "app", content: appContent, mode: 0o755 },
  ];
}

async function handle({ args }: { args: NewArgs }) {
  const { name, git } = args;
  const manager = (args.pm as pm.PM) ?? pm.detect();
  if (args.bun) args.runtime = "bun";
  const rt = (args.runtime as Runtime) ?? runtime();
  const cwd = resolveCwd(name);

  if (exists(cwd)) {
    logger.fatal(`Directory ${chalk.bold(name)} already exists.`);
  }

  const packageManagerField = pm.getVersion(manager);
  const spinner = createSpinner();

  spinner.start(`Scaffolding ${chalk.bold(chalk.cyan(name))}...`);

  const files = getScaffoldFiles({ name, manager, packageManagerField, rt });

  await Promise.all([mkdir(join(cwd, "src")), mkdir(join(cwd, "src", "users"))]);
  await Promise.all(files.map((file) => text.write(join(cwd, file.path), file.content, { mode: file.mode })));

  spinner.succeed(`Scaffolded ${chalk.bold(chalk.cyan(name))}`);

  if (git) {
    exec.safe.sync("git", ["init"], { cwd });
    exec.safe.sync("git", ["add", "-A"], { cwd });
  }

  if (args.install) {
    logger.info(`  Installing dependencies with ${chalk.bold(manager)}...`);
    try {
      pm.install({ cwd });
    } catch {
      logger.error(`  Failed to install. Run ${chalk.bold(`${manager} install`)} manually.`);
    }
  }

  logger.info(
    "",
    `  ${chalk.green("✔")} Project created at ${chalk.bold(chalk.cyan(`./${name}`))}`,
    "",
    `  ${chalk.dim("Next steps:")}`,
    `    ${chalk.cyan(`cd ${name}`)}`,
    `    ${chalk.cyan("./app dev")}`,
    "",
    `  ${chalk.dim("Commands:")}`,
    `    ${chalk.cyan("./app dev")}        ${chalk.dim("Start development server")}`,
    `    ${chalk.cyan("./app build")}      ${chalk.dim("Build for production")}`,
    `    ${chalk.cyan("./app add module <name>")}  ${chalk.dim("Generate a module")}`,
    ""
  );
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
    bun: {
      type: "boolean",
      description: "Use Bun runtime (shorthand for --runtime=bun)",
    },
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation",
    },
    git: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip git init",
    },
  },
  run: handle,
});
