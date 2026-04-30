import { defineCommand } from "citty";
import { watch } from "./esbuild/watch.js";
import { loadConfig } from "#/config/index.js";

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

    sourcemap: {
      type: "boolean",
      alias: ["s"],
      description: "Enable sourcemap",
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
  async run({ args }) {
    const { _, ...options } = args;
    delete options["env-file"];
    delete options["kill-signal"];
    const config = await loadConfig({ ...options, mode: "dev" });
    return watch(config);
  },
});
