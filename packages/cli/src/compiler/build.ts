import { defineCommand } from "citty";
import { handleAction } from "./esbuild/index.js";
import type { CliOption } from "../command.js";

export interface BuildOptions {
  outdir?: string;
  minify?: boolean;
  sourcemap?: boolean;
  tsconfig?: string;
  check?: boolean;
  target?: string;
}

export async function runBuild(opts: BuildOptions): Promise<void> {
  const cliOption: CliOption = {
    clean: true,
    minify: opts.minify,
    sourcemap: opts.sourcemap,
    outdir: opts.outdir,
    tsconfig: opts.tsconfig,
    check: opts.check,
    target: opts.target,
  };
  await handleAction(cliOption);
}

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
    await runBuild({
      outdir: args.outdir,
      minify: args.minify,
      sourcemap: args.sourcemap,
      tsconfig: args.tsconfig,
      check: args.check,
      target: args.target,
    });
  },
});
