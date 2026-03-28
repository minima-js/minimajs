import { defineCommand } from "citty";
import { handleAction } from "../esbuild/index.js";

export const buildCommand = defineCommand({
  meta: {
    name: "build",
    description: "Compile TypeScript to production JavaScript",
  },
  args: {
    entry: {
      type: "positional",
      description: "Entry file",
      required: false,
      default: "src/index.ts",
    },
    outdir: {
      type: "string",
      alias: ["o"],
      description: "Output directory",
      valueHint: "dir",
      default: "dist",
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
    await handleAction(args.entry, {
      clean: true,
      minify: args.minify,
      sourcemap: args.sourcemap,
      outdir: args.outdir,
      tsconfig: args.tsconfig,
      ignoreTypes: args["ignore-types"],
      target: args.target,
    });
  },
});
