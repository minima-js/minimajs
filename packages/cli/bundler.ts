/// <reference types="node" />
import * as esbuild from "esbuild";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const stubPlugin: esbuild.Plugin = {
  name: "stub",
  setup(build) {
    build.onLoad({ filter: /\.stub$/ }, (args) => {
      const raw = readFileSync(args.path, "utf8");
      const escaped = raw.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
      const contents =
        `export default function(vars){` +
        `const t=\`${escaped}\`;` +
        `return t.replace(/\\{\\{\\s*(\\w+)\\s*\\}\\}/g,(_,k)=>vars[k]??("{{"+k+"}}"));}`;
      return { contents, loader: "js" };
    });
  },
};

const watch = process.argv.includes("--watch");

const tsc = fileURLToPath(import.meta.resolve("typescript/bin/tsc"));

const cjsShim = `import { createRequire } from"module"; const require = createRequire(import.meta.url);`;

const shared: esbuild.BuildOptions = {
  bundle: true,
  platform: "node",
  format: "esm",
  plugins: [stubPlugin],
  banner: { js: cjsShim },
  logLevel: "info",
};

const entries: esbuild.BuildOptions[] = [
  {
    entryPoints: ["src/index.ts"],
    outfile: "lib/index.js",
    external: ["esbuild", "typescript"],
  },
  {
    entryPoints: ["src/compiler/plugins/typescript/worker.ts"],
    outfile: "lib/worker.js",
    external: ["typescript"],
  },
];

function spawnTsc(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(tsc, args, { stdio: "inherit" });
    proc.on("close", (code) => resolve(code ?? 0));
  });
}

if (watch) {
  const tscProc = spawn(tsc, ["--noEmit", "--watch", "--preserveWatchOutput"], { stdio: "inherit" });
  process.on("exit", () => tscProc.kill());

  const contexts = await Promise.all(entries.map((e) => esbuild.context({ ...shared, ...e })));
  await Promise.all(contexts.map((ctx) => ctx.watch()));
} else {
  const [typeErrors] = await Promise.all([
    spawnTsc(["--noEmit"]),
    Promise.all(entries.map((e) => esbuild.build({ ...shared, ...e }))),
  ]);

  if (typeErrors !== 0) process.exit(typeErrors);
}
