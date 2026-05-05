import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "../utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../creator/templates/index.js";
import { runtime } from "../runtime/index.js";
import { resolvePM } from "#/creator/package-manager.js";
import { manifest } from "#/manifest/index.js";
import { pkgm } from "#/pkgm/index.js";

interface HandleInit {
  force: boolean;
  corepack: boolean;
  install: boolean;
  pm?: string;
}
function handle(args: HandleInit) {
  const { force } = args;
  const rt = runtime.detect();

  const { manager, version, isCorepack } = resolvePM(args.pm, args.corepack);
  const configFile = `minimajs.config.${rt === "bun" ? "ts" : "js"}`;
  const appContent =
    rt === "bun"
      ? templates.app.bun()
      : isCorepack
        ? templates.app.nodeCorepack({ pm: manager })
        : templates.app.node({ pm: manager });

  const files = [
    { path: "app", content: appContent, mode: 0o755 },
    { path: "tsconfig.json", content: templates.tsconfig() },
    {
      path: configFile,
      content: isCorepack
        ? `${templates.minimajsConfig({ runtime: rt })}\nexport const corepack = true;\n`
        : templates.minimajsConfig({ runtime: rt }),
    },
  ];

  const written: string[] = [];
  const overwritten: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (!force && exists(file.path)) {
      skipped.push(file.path);
    } else {
      const isOverwrite = exists(file.path);
      text.write.sync(file.path, file.content, { mode: file.mode });
      (isOverwrite ? overwritten : written).push(file.path);
    }
  }

  const desired = `${manager}@${version}`;
  const pkg = manifest.sync();
  const pmChanged = force && pkg.packageManager !== desired;
  if (pmChanged) {
    manifest.write.sync({ ...pkg, packageManager: desired });
  }

  if (pmChanged && args.install) {
    logger.info(`  Installing dependencies with ${chalk.bold(manager)}...`);
    pkgm.install({ manager, corepack: isCorepack, frozen: false });
  }

  if (written.length === 0 && overwritten.length === 0 && !pmChanged) {
    logger.warn("Nothing to do — all files already exist. Use --force to overwrite.");
    return;
  }

  logger.info(
    "",
    ...written.map((f) => `  ${chalk.green("✔")} Created ${chalk.bold(chalk.cyan(f))}`),
    ...overwritten.map((f) => `  ${chalk.yellow("✔")} Overwrote ${chalk.bold(chalk.cyan(f))}`),
    ...skipped.map((f) => `  ${chalk.dim("-")} Skipped ${chalk.dim(f)} (already exists)`),
    ""
  );
}

export const initCommand = defineCommand({
  meta: { name: "init", description: "Scaffold tsconfig.json and minimajs.config in the current directory" },
  args: {
    pm: {
      type: "string",
      description: "Package manager to use",
      valueHint: "bun|pnpm|yarn|npm",
    },
    force: {
      type: "boolean",
      alias: ["f"],
      description: "Overwrite existing files and update packageManager field",
      default: false,
    },
    corepack: {
      type: "boolean",
      default: false,
      description: "Enable Corepack for package manager version enforcement",
    },
    install: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip dependency installation after package manager change",
    },
  },
  run: ({ args }) => handle(args),
});
