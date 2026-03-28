import { EOL } from "node:os";
import esbuild, { type BuildOptions } from "esbuild";
import ora from "ora";
import { bold, cyan } from "../utils/colors.js";
import { relativeId } from "../utils/path.js";
import { errorMessage, stderr, successMessage } from "../utils/logging.js";
import { getEntry } from "../utils/utils.js";
import { tsc } from "../plugins/typescript/tsc.js";
import type { CliOption } from "../command.js";

async function typeCheck(config?: string): Promise<void> {
  let hasError = false;
  for await (const log of tsc({ config })) {
    hasError = true;
    process.stderr.write(log as unknown as string);
  }
  if (hasError) {
    process.exit(1);
  }
}

export async function build(inputOptions: BuildOptions, config: CliOption): Promise<void> {
  const start = Date.now();
  const files = relativeId(inputOptions.outdir!);
  const inputFiles = relativeId(getEntry(inputOptions));
  const spinner = ora();
  stderr(cyan(`\n${bold(inputFiles!)} → ${bold(files)}...`));
  spinner.start();
  if (!config.ignoreTypes) {
    spinner.text = "checking types..." + EOL;
    await typeCheck(inputOptions.tsconfig);
  }
  spinner.text = "bundling..." + EOL;
  try {
    const { metafile } = await esbuild.build(inputOptions);
    spinner.succeed(successMessage(files, metafile!, start));
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "errors" in err
        ? errorMessage(err.errors as unknown[])
        : err instanceof Error
          ? err.message
          : String(err);
    spinner.fail(message);
  }
}
