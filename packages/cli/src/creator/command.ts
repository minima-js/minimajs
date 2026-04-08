import { defineCommand } from "citty";
import { join } from "node:path";
import { resolveCwd } from "../utils/path.js";
import chalk from "chalk";
import { createSpinner } from "../utils/spinner.js";
import { logger } from "../utils/logger.js";
import { templates } from "./templates/index.js";
import type { Runtime } from "../config/types.js";
import * as pm from "../pm/index.js";
import { exec } from "../exec/index.js";
import { exists, text, mkdir } from "../utils/fs.js";
import { runtime } from "../runtime/index.js";

const PM_EXEC: Record<Exclude<pm.PM, "bun">, string> = {
  npm: "npx --no minimajs",
  pnpm: "pnpm exec minimajs",
  yarn: "yarn minimajs",
};

function resolveVersionFileValue(rt: Runtime): string {
  if (rt === "bun" && typeof process.versions.bun === "string") return process.versions.bun;
  if (rt === "node" && typeof process.versions.bun !== "string") return process.versions.node;

  try {
    return exec.sync.capture(rt, ["--version"]).stdout.trim().replace(/^v/, "");
  } catch {
    return rt === "bun" ? "latest" : process.versions.node;
  }
}

function renderPackageJson(name: string, rt: Runtime, packageManager?: string | null): string {
  const stub = rt === "bun" ? templates.packageBun : templates.packageNode;
  const raw = stub({ name, packageManager: packageManager ?? "" });
  if (!packageManager) return raw.replace(/\n\s+"packageManager": "",/, "");
  return raw;
}

interface NewArgs {
  name: string;
  pm?: string;
  runtime?: string;
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
    rt === "bun" ? templates.appBun() : templates.appNode({ exec: PM_EXEC[manager as Exclude<pm.PM, "bun">] });

  return [
    { path: "package.json", content: renderPackageJson(name, rt, packageManagerField) },
    { path: "tsconfig.json", content: templates.tsconfig() },
    { path: `minimajs.config.${rt === "bun" ? "ts" : "js"}`, content: templates.minimaJsConfig({ runtime: rt }) },
    { path: join("src", "index.ts"), content: templates.index({ runtime: rt }) },
    { path: join("src", "module.ts"), content: templates.rootModule() },
    { path: ".gitignore", content: templates.gitignore() },
    { path: ".env", content: templates.env() },
    { path: versionFile, content: resolveVersionFileValue(rt) + "\n" },
    { path: "app", content: appContent, mode: 0o755 },
  ];
}

async function handle({ args }: { args: NewArgs }) {
  const { name, git } = args;
  const manager = (args.pm as pm.PM) ?? pm.detect();
  const rt = (args.runtime as Runtime) ?? runtime();
  const cwd = resolveCwd(name);

  if (exists(cwd)) {
    logger.fatal(`Directory ${chalk.bold(name)} already exists.`);
  }

  const packageManagerField = pm.getVersion(manager);
  const spinner = createSpinner();

  spinner.start(`Scaffolding ${chalk.bold(chalk.cyan(name))}...`);

  const files = getScaffoldFiles({ name, manager, packageManagerField, rt });

  await mkdir(join(cwd, "src"));
  await Promise.all(files.map((file) => text.write(join(cwd, file.path), file.content, { mode: file.mode })));

  spinner.succeed(`Scaffolded ${chalk.bold(chalk.cyan(name))}`);

  if (git) {
    exec.sync.safe("git", ["init"], { cwd });
    exec.sync.safe("git", ["add", "-A"], { cwd });
  }

  if (args.install) {
    spinner.start(`Installing dependencies with ${chalk.bold(manager)}...`);
    try {
      await pm.install({ cwd });
      spinner.succeed("Dependencies installed");
    } catch {
      spinner.fail(`Failed to install. Run ${chalk.bold(`${manager} install`)} manually.`);
    }
  }

  logger.info(
    "",
    `  ${chalk.green("✔")} Project created at ${chalk.bold(chalk.cyan(`./${name}`))}`,
    "",
    `  ${chalk.dim("Next steps:")}`,
    `    ${chalk.cyan(`cd ${name}`)}`,
    `    ${chalk.cyan(`${manager} run dev`)}`,
    "",
    `  ${chalk.dim("Tip: use")} ${chalk.cyan("./app")} ${chalk.dim("as a shortcut for")} ${chalk.cyan("minimajs")}`,
    `    ${chalk.dim("e.g.")} ${chalk.cyan("./app add module users")}`,
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
