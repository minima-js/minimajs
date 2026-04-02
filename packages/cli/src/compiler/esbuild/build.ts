import { EOL } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import esbuild, { type BuildOptions } from "esbuild";
import { bold, cyan, red } from "../../utils/colors.js";
import { relativeId } from "../../utils/path.js";
import { errorMessage, stderr, successMessage } from "../../utils/logging.js";
import { getEntryLabel } from "../../utils/utils.js";
import type { Config } from "../../config/index.js";
import { createSpinner } from "../../utils/spinner.js";

const tscBin = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));

export async function build(inputOptions: BuildOptions, config: Config): Promise<void> {
  const start = Date.now();
  const files = relativeId(inputOptions.outdir!);
  const inputFiles = relativeId(getEntryLabel(inputOptions));
  const spinner = createSpinner();
  stderr(cyan(`\n${bold(inputFiles)} → ${bold(files)}...`));

  if (!config.ignoreTypes) {
    process.stderr.write(cyan("type checking...\n"));
    const result = spawnSync(process.execPath, [tscBin, "--noEmit", "--project", inputOptions.tsconfig ?? "tsconfig.json"], {
      stdio: "inherit",
    });
    if (result.status !== 0) {
      process.stderr.write(red("Type check failed\n"));
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
    spinner.fail(errors ? errorMessage(errors) : err instanceof Error ? err.message : String(err));
    return;
  }

  spinner.succeed(successMessage(files, buildResult.metafile!, start));
}
