/// <reference types="node" />
import * as esbuild from "esbuild";
import { generateDtsBundle } from "dts-bundle-generator";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";

const stubPlugin: esbuild.Plugin = {
  name: "stub",
  setup(build) {
    build.onLoad({ filter: /\.stub$/ }, (args) => {
      const raw = readFileSync(args.path, "utf8");
      const escaped = raw.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
      const contents =
        `export default function(vars = {}) {` +
        `const t=\`${escaped}\`;` +
        `return t.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g,(_,k)=>vars[k]??("{{"+k+"}}"));}`;
      return { contents, loader: "js" };
    });
  },
};

const watch = process.argv.includes("--watch");

const tsc = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));

const cjsShim = `import { createRequire } from "module"; const require = createRequire(import.meta.url);`;

const buildOptions: esbuild.BuildOptions = {
  entryPoints: {
    index: "src/index.ts",
    command: "src/command.ts",
    worker: "src/compiler/plugins/typescript/worker.ts",
  },
  outdir: "lib",
  bundle: true,
  platform: "node",
  format: "esm",
  external: ["esbuild", "typescript"],
  plugins: [stubPlugin],
  banner: { js: cjsShim },
  logLevel: "info",
};

function spawnTsc(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(tsc, args, { stdio: "inherit" });
    proc.on("close", (code) => resolve(code ?? 0));
  });
}

if (watch) {
  const tscProc = spawn(tsc, ["--noEmit", "--watch", "--preserveWatchOutput"], { stdio: "inherit" });
  process.on("exit", () => tscProc.kill());

  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
} else {
  const [typeErrors] = await Promise.all([spawnTsc(["--noEmit"]), esbuild.build(buildOptions)]);

  if (typeErrors !== 0) process.exit(typeErrors);

  const [types] = generateDtsBundle([{ filePath: "src/index.ts" }]);
  writeFileSync("types.d.ts", types);
}
