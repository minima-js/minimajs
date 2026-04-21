import type { Plugin } from "esbuild";
import { createSpinner } from "#/utils/spinner.js";
import chalk from "chalk";
import { relativeId } from "#/utils/path.js";
import { getResetScreen } from "#/utils/screen.js";
import { logger } from "#/utils/logger.js";
import { format } from "../format.js";
import { getEntryLabel } from "../esbuild/entry.js";

interface ProgressOption {
  message?: string;
  dist: string;
  clear: boolean;
}

export function progress({ clear, ...options }: ProgressOption): Plugin {
  const message = options.message ?? "Building";
  const spinner = createSpinner();
  const dist = relativeId(options.dist);
  return {
    name: "progress",
    setup(build) {
      let started = 0;
      const reset = getResetScreen();
      const input = relativeId(getEntryLabel(build.initialOptions));
      build.onStart(() => {
        clear && reset();
        logger.info(chalk.cyan(`\nbundles ${chalk.bold(input!)} → ${chalk.bold(dist)}...`));
        spinner.text = message + "\n";
        spinner.start();
        started = Date.now();
      });
      build.onEnd((result) => {
        result.errors.length
          ? spinner.fail(format.error(result.errors))
          : spinner.succeed(format.success(dist, result.metafile!, started));
        logger.info(chalk.dim(`⧖ waiting for changes...`));
      });
    },
  };
}
