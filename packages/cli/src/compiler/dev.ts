import { defineCommand } from "citty";
import { handleAction } from "./esbuild/index.js";
import type { CliOption } from "../command.js";

export interface DevOptions {
  envFile?: string;
  tsconfig?: string;
  check?: boolean;
  reset?: boolean;
  killSignal?: NodeJS.Signals;
  grace?: boolean | undefined;
}

export async function runDev(opts: DevOptions): Promise<void> {
  const cliOption: CliOption = {
    watch: true,
    clean: false,
    sourcemap: true,
    envFile: opts.envFile,
    tsconfig: opts.tsconfig,
    check: opts.check,
    reset: opts.reset,
    killSignal: opts.killSignal,
    grace: opts.grace === false ? false : undefined,
  };
  await handleAction(cliOption);
}

export const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Start development server with watch + auto-restart",
  },
  args: {
    "env-file": {
      type: "string",
      description: "Path to .env file",
      valueHint: "path",
    },
    tsconfig: {
      type: "string",
      alias: ["p"],
      description: "Path to tsconfig.json",
      valueHint: "path",
    },
    reset: {
      type: "boolean",
      description: "Clear screen on each rebuild",
    },
    "kill-signal": {
      type: "string",
      description: "Signal used to stop process before restart",
      valueHint: "SIGTERM|SIGKILL",
    },
    grace: {
      type: "boolean",
      default: true,
      negativeDescription: "Force restart without graceful shutdown",
    },
  },
  async run({ args }) {
    await runDev({
      envFile: args["env-file"],
      tsconfig: args.tsconfig,
      reset: args.reset,
      killSignal: args["kill-signal"] as NodeJS.Signals | undefined,
      grace: args.grace === false ? false : undefined,
    });
  },
});
