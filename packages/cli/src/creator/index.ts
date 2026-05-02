import { defineCommand } from "citty";
import { join } from "node:path";
import { resolveCwd } from "#/utils/path.js";
import chalk from "chalk";
import { createSpinner } from "#/utils/spinner.js";
import { logger } from "#/utils/logger.js";
import { templates } from "./templates/index.js";
import type { Runtime } from "../config/types.js";
import { pkgm, type PM } from "../pkgm/index.js";
import { resolvePM } from "./package-manager.js";
import { exec } from "../utils/exec.js";
import { exists, text, mkdir } from "../utils/fs.js";
import { runtime } from "../runtime/index.js";
import { EOL } from "node:os";
import { manifest } from "#/manifest/index.js";

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

interface ScaffoldContext {
  projectName: string;
  runtime: Runtime;
  runtimeVersion: string;
  pm: PM;
  pmSpec: string;
}

function getScaffoldFiles({ projectName, runtime: rt, runtimeVersion, pm, pmSpec }: ScaffoldContext): ScaffoldFile[] {
  const versionFile = rt === "bun" ? ".bun-version" : ".node-version";
  const appContent =
    rt === "bun" ? templates.app.bun() : templates.app.node({ exec: pkgm.EXEC[pm as Exclude<PM, "bun">] ?? pkgm.EXEC.npm });

  return [
    { path: "package.json", content: renderPackageJson(projectName, rt, pmSpec) },
    { path: "tsconfig.json", content: templates.tsconfig() },
    { path: `minimajs.config.${rt === "bun" ? "ts" : "js"}`, content: templates.minimajsConfig({ runtime: rt }) },
    { path: join("src", "index.ts"), content: templates.index({ runtime: rt }) },
    { path: join("src", "module.ts"), content: templates.rootModule() },
    { path: join("src", "users", "module.ts"), content: templates.usersModule() },
    { path: join("src", "users", "users.handler.ts"), content: templates.usersHandler() },
    { path: ".gitignore", content: templates.gitignore() },
    { path: ".env", content: templates.env() },
    { path: versionFile, content: runtimeVersion + EOL },
    { path: "app", content: appContent, mode: 0o755 },
    ...(pm === "yarn" ? [{ path: "yarn.lock", content: "" }] : []),
  ];
}

async function handle({ args }: { args: NewArgs }) {
  const { name, git } = args;
  if (args.bun) {
    args.runtime = "bun";
    args.pm ??= "bun";
  }

  const { name: rt, version: rtVersion } = runtime.resolve(args.runtime as Runtime | undefined);
  const { manager, version, isCorepack } = resolvePM(args.pm);
  const cwd = resolveCwd(name);

  if (exists(cwd)) {
    logger.fatal(`Directory ${chalk.bold(name)} already exists.`);
  }

  const pmSpec = `${manager}@${version}`;
  const spinner = createSpinner();

  spinner.start(`Scaffolding ${chalk.bold(chalk.cyan(name))}...`);

  const files = getScaffoldFiles({
    projectName: name,
    runtime: rt,
    runtimeVersion: rtVersion,
    pm: manager,
    pmSpec,
  });

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
      const { dependencies = {}, devDependencies = {}, ...rest } = manifest.sync(cwd);
      const deps = Object.keys(dependencies);
      const devDeps = Object.keys(devDependencies);
      manifest.write.sync(rest, 2, { cwd });
      if (deps.length) pkgm.add(deps, { manager, cwd, corepack: isCorepack });
      if (devDeps.length) pkgm.add(devDeps, { manager, cwd, dev: true, corepack: isCorepack });
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
