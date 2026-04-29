import type { Plugin, PluginBuild } from "esbuild";
import { runProcess } from "./node-runner.js";
import chalk from "chalk";
import { logger } from "#/utils/logger.js";

interface RunOption {
  bin: string;
  args: string[];
  killSignal?: NodeJS.Signals;
  env: NodeJS.ProcessEnv;
}

export function run(opt: RunOption): Plugin {
  return {
    name: "plugin-run",
    setup: (arg) => setup(arg, opt),
  };
}

let restartListenerAttached = false;

async function setup(build: PluginBuild, opts: RunOption): Promise<void> {
  const execute = createRunner(opts);
  build.onEnd(({ errors }) => {
    if (!errors.length) {
      logger.info(chalk.dim(`↺ ${chalk.bold("rs")} ⏎ to restart`));
      execute();
    }
  });
  onRestart(execute);
}

function onRestart(execute: ReturnType<typeof createRunner>): void {
  if (restartListenerAttached) return;
  restartListenerAttached = true;
  const input = process.stdin;
  if (!input.isTTY) return;

  input.setEncoding("utf8");
  input.resume();
  input.on("data", (chunk: string) => {
    if (chunk.trim() === "rs") void execute();
  });
}

export function createRunner(option: RunOption): () => Promise<void> {
  let stopProcess: ReturnType<typeof runProcess> | null = null;
  let isExecuting = false;

  return async function execute(): Promise<void> {
    if (isExecuting) return;
    isExecuting = true;
    try {
      await stopProcess?.(option.killSignal);
      stopProcess = runProcess(option.bin, option.args, option.env);
    } finally {
      isExecuting = false;
    }
  };
}
