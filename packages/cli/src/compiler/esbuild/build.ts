import { EOL } from "node:os";
import chalk from "chalk";
import esbuild from "esbuild";
import { relativeId } from "#/utils/path.js";
import { logger } from "#/utils/logger.js";
import { format } from "../format.js";
import { getEntryLabel } from "./entry.js";
import type { Config } from "#/config/index.js";
import { createSpinner } from "#/utils/spinner.js";
import { runCheck } from "#/check/index.js";
import { buildEsbuildConfig } from "./builder.js";

export async function build(config: Config): Promise<void> {
  const inputOptions = await buildEsbuildConfig(config);
  const start = Date.now();
  const files = relativeId(inputOptions.outdir!);
  const inputFiles = relativeId(getEntryLabel(inputOptions));
  const spinner = createSpinner();
  logger.info(chalk.cyan(`\n${chalk.bold(inputFiles)} → ${chalk.bold(files)}...`));

  if (config.check) {
    runCheck(inputOptions.tsconfig);
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
