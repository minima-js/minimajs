import type { BaseConfig } from "./types.js";

export const defaults: BaseConfig = {
  entry: ["src/index.ts", "src/**/module.ts"],
  exec: "node [filename]",
  outdir: "dist",
  loader: {},
  clean: true,
  check: true,
  import: [],
  minify: false,
  reset: false,
  killSignal: "SIGTERM",
  run: false,
  tsconfig: "tsconfig.json",
  sourcemap: false,
  watch: false,
};
