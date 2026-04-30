import { defineCommand } from "citty";
import { build } from "./esbuild/index.js";
import { loadConfig } from "#/config/index.js";

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
      alias: ["p"],
      description: "Path to tsconfig.json",
      valueHint: "path",
    },
    check: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip TypeScript type checking",
    },
    target: {
      type: "string",
      alias: ["t"],
      description: "Target environment",
      valueHint: "node22",
    },
  },
  async run({ args }) {
    const config = await loadConfig({ ...args, mode: "build", run: false });
    return build(config);
  },
});
