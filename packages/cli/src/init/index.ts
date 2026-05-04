import { defineCommand } from "citty";
import chalk from "chalk";
import { exists, text } from "../utils/fs.js";
import { logger } from "#/utils/logger.js";
import { templates } from "../creator/templates/index.js";
import { runtime } from "../runtime/index.js";
import { pkgm, type PM } from "../pkgm/index.js";

function handle({ force }: { force: boolean }) {
  const rt = runtime.detect();
  const manager = pkgm();
  const configFile = `minimajs.config.${rt === "bun" ? "ts" : "js"}`;
  const appContent =
    rt === "bun"
      ? templates.app.bun()
      : templates.app.node({ corepackFlag: "", exec: pkgm.EXEC[manager as Exclude<PM, "bun">] ?? pkgm.EXEC.npm });

  const files = [
    { path: "app", content: appContent, mode: 0o755 },
    { path: "tsconfig.json", content: templates.tsconfig() },
    { path: configFile, content: templates.minimajsConfig({ runtime: rt }) },
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

  if (written.length === 0 && overwritten.length === 0) {
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
    force: {
      type: "boolean",
      alias: ["f"],
      description: "Overwrite existing files and update packageManager field",
      default: false,
    },
  },
  run({ args }) {
    return handle(args);
  },
});
