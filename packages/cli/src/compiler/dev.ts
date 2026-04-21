import { defineCommand } from "citty";
import { handleAction } from "./esbuild/index.js";
import type { CliOption } from "../command.js";

function runDev(opts: CliOption): Promise<void> {
  return handleAction({
    build: false,
    watch: true,
    clean: false,
    sourcemap: true,
    ...opts,
  });
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
    check: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip TypeScript type checking",
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
    run: {
      type: "boolean",
      default: true,
      negativeDescription: "Watch and rebuild without running the process",
    },
    exec: {
      type: "string",
      description: "Custom command to run after build",
      valueHint: "'node [filename]'",
    },
  },
  run({ args }) {
    return runDev({
      envFile: args["env-file"],
      tsconfig: args.tsconfig,
      check: args.check,
      reset: args.reset,
      run: args.run === false ? false : undefined,
      exec: args.exec,
      killSignal: args["kill-signal"] as NodeJS.Signals | undefined,
      grace: args.grace === false ? false : undefined,
    });
  },
});
