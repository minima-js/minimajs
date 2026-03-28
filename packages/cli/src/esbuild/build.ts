import { EOL } from "node:os";
import esbuild, { type BuildOptions } from "esbuild";
import ora from "ora";
import { bold, cyan, red } from "../utils/colors.js";
import { relativeId } from "../utils/path.js";
import { errorMessage, stderr, successMessage } from "../utils/logging.js";
import { getEntry } from "../utils/utils.js";
import { runTypeCheck } from "../plugins/typescript/checker.js";
import type { CliOption } from "../command.js";

export async function build(inputOptions: BuildOptions, config: CliOption): Promise<void> {
  const start = Date.now();
  const files = relativeId(inputOptions.outdir!);
  const inputFiles = relativeId(getEntry(inputOptions));
  const spinner = ora();
  stderr(cyan(`\n${bold(inputFiles!)} → ${bold(files)}...`));
  spinner.start();
  spinner.text = (config.ignoreTypes ? "bundling..." : "bundling + type checking...") + EOL;

  // Run esbuild and tsc type check in parallel
  const buildPromise = esbuild.build(inputOptions);
  const typePromise = config.ignoreTypes ? Promise.resolve(0) : runTypeCheck(inputOptions.tsconfig ?? "tsconfig.json");

  const [buildResult, errorCount] = await Promise.all([
    buildPromise.catch((err: unknown) => err),
    typePromise.catch(() => 1),
  ]);

  if (
    buildResult instanceof Error ||
    (buildResult && "errors" in (buildResult as object) && (buildResult as { errors: unknown[] }).errors.length > 0)
  ) {
    const message =
      buildResult && typeof buildResult === "object" && "errors" in buildResult
        ? errorMessage((buildResult as { errors: unknown[] }).errors)
        : buildResult instanceof Error
          ? buildResult.message
          : String(buildResult);
    spinner.fail(message);
    return;
  }

  if (errorCount > 0) {
    spinner.fail(red(`Type check failed with ${errorCount} error${errorCount > 1 ? "s" : ""}`));
    process.exit(1);
  }

  const { metafile } = buildResult as Awaited<ReturnType<typeof esbuild.build>>;
  spinner.succeed(successMessage(files, metafile!, start));
}
