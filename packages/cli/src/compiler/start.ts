import { spawn } from "node:child_process";
import { defineCommand } from "citty";
import chalk from "chalk";
import { loadConfig, resolveRunCommand } from "../config/index.js";
import { logger } from "#/utils/logger.js";
import { exists } from "#/utils/fs.js";
import { getOutputFilename } from "#/utils/path.js";

export interface StartOptions {
  envFile?: string;
  sourcemap?: boolean;
}

export async function runStart(opts: StartOptions): Promise<void> {
  const config = await loadConfig(opts);
  const entry = getOutputFilename(config.entry[0]!, config.outdir);
  const needsEntry = !config.exec || config.exec.includes("[filename]");

  if (needsEntry) {
    if (!config.entry[0] || !exists(entry)) {
      logger.fatal(`Cannot find compiled output. Run ${chalk.bold(chalk.cyan("minimajs build"))} first.`);
    }
  }

  const { bin, args, env } = resolveRunCommand(config, entry!);

  await new Promise<void>((resolve) => {
    const proc = spawn(bin, args, { stdio: "inherit", killSignal: config.killSignal, env });
    proc.on("exit", () => resolve());
    proc.on("error", (err) => {
      logger.error(`Failed to start process "${bin}": ${err.message}`);
      resolve();
    });
    process.once("SIGTERM", () => proc.kill("SIGTERM"));
    process.once("SIGINT", () => proc.kill("SIGINT"));
  });
}

export const startCommand = defineCommand({
  meta: {
    name: "start",
    description: "Run the compiled production build",
  },
  args: {
    "env-file": {
      type: "string",
      description: "Path to .env file",
      valueHint: "path",
    },
    sourcemap: {
      type: "boolean",
      alias: ["s"],
      description: "Enable sourcemaps",
    },
  },
  run({ args }) {
    const { _, ...options } = args;
    delete options["env-file"];
    return runStart(options);
  },
});
