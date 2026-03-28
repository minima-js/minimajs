import { defineCommand, runMain } from "citty";
import type { CliOption } from "./config/types.js";
import { handleAction } from "./esbuild/index.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type { CliOption };

const pkgPath = join(fileURLToPath(import.meta.url), "../../package.json");
const { version } = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };

const main = defineCommand({
  meta: {
    name: "minimajs",
    version,
    description: "CLI for building, watching, and running MinimaJS TypeScript projects",
  },
  args: {
    filename: {
      type: "positional",
      description: "Entry file to build (auto-detected from package.json if omitted)",
      required: false,
    },
    watch: {
      type: "boolean",
      alias: ["w"],
      description: "Watch for changes and rebuild automatically",
    },
    run: {
      type: "boolean",
      alias: ["r"],
      description: "Run the program after build",
    },
    import: {
      type: "string",
      alias: ["i"],
      description: "Import additional files before entry (comma-separated)",
    },
    "env-file": {
      type: "string",
      description: "Path to .env file (only used with --run)",
      valueHint: "path",
    },
    clean: {
      type: "boolean",
      default: true,
      negativeDescription: "Skip cleaning output directory",
    },
    sourcemap: {
      type: "boolean",
      alias: ["s"],
      description: "Generate sourcemaps",
    },
    tsconfig: {
      type: "string",
      description: "Path to custom tsconfig.json",
      valueHint: "path",
    },
    minify: {
      type: "boolean",
      alias: ["m"],
      description: "Minify output code",
    },
    reset: {
      type: "boolean",
      default: false,
      description: "Clear screen on each rebuild (watch mode)",
    },
    "ignore-types": {
      type: "boolean",
      description: "Skip TypeScript type checking",
    },
    "node-options": {
      type: "string",
      description: "Options to pass to the Node.js runtime (space-separated)",
      valueHint: "options",
    },
    "kill-signal": {
      type: "string",
      description: "Signal to send before restart",
      valueHint: "SIGTERM|SIGKILL",
    },
    grace: {
      type: "boolean",
      default: true,
      negativeDescription: "Force restart without graceful shutdown",
    },
    outdir: {
      type: "string",
      alias: ["o"],
      description: "Override output directory",
      valueHint: "dir",
    },
    format: {
      type: "string",
      alias: ["f"],
      description: "Override module format",
      valueHint: "esm|cjs",
    },
    ext: {
      type: "string",
      description: "Output file extension",
      valueHint: ".js|.mjs|.cjs",
    },
    polyfills: {
      type: "string",
      alias: ["p"],
      description: "Enable polyfills (comma-separated): cjs",
      valueHint: "cjs",
    },
    target: {
      type: "string",
      alias: ["t"],
      description: "Override target environment",
      valueHint: "node18",
    },
  },
  async run({ args }) {
    const opt: CliOption = {};

    if (args.watch) opt.watch = true;
    if (args.run) opt.run = true;
    if (args.sourcemap) opt.sourcemap = true;
    if (args.minify) opt.minify = true;
    if (args["ignore-types"]) opt.ignoreTypes = true;
    if (args.reset) opt.reset = true;
    if (!args.clean) opt.clean = false;
    if (!args.grace) opt.grace = false;
    if (args.outdir) opt.outdir = args.outdir;
    if (args.format) opt.format = args.format as CliOption["format"];
    if (args.ext) opt.ext = args.ext;
    if (args.target) opt.target = args.target;
    if (args.tsconfig) opt.tsconfig = args.tsconfig;
    if (args["env-file"]) opt.envFile = args["env-file"];
    if (args["kill-signal"]) opt.killSignal = args["kill-signal"] as NodeJS.Signals;
    if (args["node-options"]) opt.nodeOptions = args["node-options"].split(" ");
    if (args.import) opt.import = args.import.split(",").map((s) => s.trim());
    if (args.polyfills) opt.polyfills = args.polyfills.split(",").map((s) => s.trim()) as CliOption["polyfills"];

    await handleAction(args.filename ?? "", opt);
  },
});

export function run(): void {
  runMain(main);
}
