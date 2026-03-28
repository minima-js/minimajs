import { defineCommand } from "citty";
import { handleAction } from "../esbuild/index.js";

export const devCommand = defineCommand({
  meta: {
    name: "dev",
    description: "Start development server with watch + hot reload",
  },
  args: {
    entry: {
      type: "positional",
      description: "Entry file",
      required: false,
      default: "src/index.ts",
    },
    "env-file": {
      type: "string",
      description: "Path to .env file",
      valueHint: "path",
      default: ".env",
    },
    tsconfig: {
      type: "string",
      description: "Path to tsconfig.json",
      valueHint: "path",
    },
    "ignore-types": {
      type: "boolean",
      description: "Skip TypeScript type checking",
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
    await handleAction(args.entry, {
      watch: true,
      run: true,
      clean: false,
      envFile: args["env-file"],
      tsconfig: args.tsconfig,
      ignoreTypes: args["ignore-types"],
      reset: args.reset,
      killSignal: args["kill-signal"] as NodeJS.Signals | undefined,
      grace: args.grace === false ? false : undefined,
    });
  },
});
