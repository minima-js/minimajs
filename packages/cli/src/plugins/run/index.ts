import { EOL } from "node:os";
import type { Plugin, PluginBuild } from "esbuild";
import { runNode } from "./node-runner.js";
import { bold, dim } from "../../utils/colors.js";
import { log } from "../../utils/logging.js";
import { loadEnvFile } from "../../utils/env.js";

interface RunOption {
  filename: string;
  nodeOptions: string[];
  killSignal?: NodeJS.Signals;
  envFile?: string;
}

export function run(opt: RunOption): Plugin {
  return {
    name: "plugin-run",
    setup: (arg) => setup(arg, opt),
  };
}

let restartListenerAttached = false;

async function setup(build: PluginBuild, opts: RunOption): Promise<void> {
  if (build.initialOptions.sourcemap) {
    opts.nodeOptions.push("--enable-source-maps");
  }
  const execute = createRunner(opts);
  build.onEnd(({ errors }) => {
    if (!errors.length) {
      log(dim(`↺ ${bold("rs")} ⏎ to restart${EOL}`));
      execute();
    }
  });
  onRestart(execute);
}

function onRestart(execute: ReturnType<typeof createRunner>): void {
  if (restartListenerAttached) return;
  restartListenerAttached = true;
  process.stdout.on("data", (buf: Buffer) => {
    const txt = buf.toString().trim();
    if (txt === "rs") {
      execute();
    }
  });
}

export function createRunner(option: RunOption): () => Promise<void> {
  let stopProcess: ReturnType<typeof runNode> | null = null;
  let isExecuting = false;

  const envVars = option.envFile ? loadEnvFile(option.envFile) : undefined;

  return async function execute(): Promise<void> {
    if (isExecuting) return;
    isExecuting = true;
    try {
      await stopProcess?.(option.killSignal);
      stopProcess = runNode(option.filename, option.nodeOptions, envVars);
    } finally {
      isExecuting = false;
    }
  };
}
