import { defineCommand } from "citty";
import { runDev, runBuild, runStart } from "./index.js";

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
    await runDev({
      envFile: args["env-file"],
      tsconfig: args.tsconfig,
      ignoreTypes: args["ignore-types"],
      reset: args.reset,
      killSignal: args["kill-signal"] as NodeJS.Signals | undefined,
      grace: args.grace === false ? false : undefined,
    });
  },
});

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Compile TypeScript to production JavaScript",
  },
  args: {
    outdir: {
      type: "string",
      alias: ["o"],
      description: "Output directory",
      valueHint: "dir",
    },
    minify: {
      type: "boolean",
      alias: ["m"],
      description: "Minify output",
    },
    sourcemap: {
      type: "boolean",
      alias: ["s"],
      description: "Emit sourcemaps",
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
    target: {
      type: "string",
      alias: ["t"],
      description: "Target environment",
      valueHint: "node18",
    },
  },
  async run({ args }) {
    await runBuild({
      outdir: args.outdir,
      minify: args.minify,
      sourcemap: args.sourcemap,
      tsconfig: args.tsconfig,
      ignoreTypes: args["ignore-types"],
      target: args.target,
    });
  },
});

export const startCommand = defineCommand({
  meta: {
    name: "start",
    description: "Run the compiled production build",
  },
  args: {
    entry: {
      type: "positional",
      description: "Compiled entry file (auto-detected from package.json if omitted)",
      required: false,
    },
    "env-file": {
      type: "string",
      description: "Path to .env file",
      valueHint: "path",
    },
  },
  async run({ args }) {
    runStart({
      entry: args.entry,
      envFile: args["env-file"],
    });
  },
});
