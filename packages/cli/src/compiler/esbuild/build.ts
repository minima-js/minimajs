import { EOL } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import esbuild, { type BuildOptions } from "esbuild";
import { relativeId } from "../../utils/path.js";
import { logger } from "../../utils/logger.js";
import { format } from "../format.js";
import { getEntryLabel } from "./entry.js";
import type { Config } from "../../config/index.js";
import { createSpinner } from "../../utils/spinner.js";

const tscBin = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));

export async function build(inputOptions: BuildOptions, config: Config): Promise<void> {
  const start = Date.now();
  const files = relativeId(inputOptions.outdir!);
  const inputFiles = relativeId(getEntryLabel(inputOptions));
  const spinner = createSpinner();
  logger.info(chalk.cyan(`\n${chalk.bold(inputFiles)} → ${chalk.bold(files)}...`));

  if (config.check) {
    logger.info(chalk.cyan("type checking..."));
    const result = spawnSync(process.execPath, [tscBin, "--noEmit", "--project", inputOptions.tsconfig ?? "tsconfig.json"], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      logger.fatal("Type check failed");
      process.exit(1);
    }
  }

  spinner.start();
  spinner.text = "bundling..." + EOL;

  let buildResult: Awaited<ReturnType<typeof esbuild.build>>;
  try {
    buildResult = await esbuild.build(inputOptions);
  } catch (err) {
    const errors = (err as { errors?: unknown[] }).errors;
    spinner.fail(errors ? format.error(errors) : err instanceof Error ? err.message : String(err));
    throw err;
  }

  spinner.succeed(format.success(files, buildResult.metafile!, start));
}
