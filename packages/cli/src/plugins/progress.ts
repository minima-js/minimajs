import type { Plugin } from "esbuild";
import ora from "ora";
import { bold, cyan, dim } from "../utils/colors.js";
import { relativeId } from "../utils/path.js";
import { getResetScreen } from "../utils/screen.js";
import { errorMessage, log, stderr, successMessage } from "../utils/logging.js";
import { getEntry } from "../utils/utils.js";

interface ProgressOption {
  message?: string;
  dist: string;
  clear: boolean;
}

export function progress({ clear, ...options }: ProgressOption): Plugin {
  const message = options.message ?? "Building";
  const spinner = ora();
  const dist = relativeId(options.dist);
  return {
    name: "progress",
    setup(build) {
      let started = 0;
      const reset = getResetScreen();
      const input = relativeId(getEntry(build.initialOptions));
      build.onStart(() => {
        clear && reset();
        stderr(cyan(`\nbundles ${bold(input!)} → ${bold(dist)}...`));
        spinner.text = message + "\n";
        spinner.start();
        started = Date.now();
      });
      build.onEnd((result) => {
        result.errors.length
          ? spinner.fail(errorMessage(result.errors))
          : spinner.succeed(successMessage(dist, result.metafile!, started));
        log(dim(`⧖ waiting for changes...`));
      });
    },
  };
}
