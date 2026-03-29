import type { BaseConfig } from "./types.js";

export const defaults: BaseConfig = {
  entry: "src/index.ts",
  modulePattern: "src/**/module.{ts,js}",
  outdir: "dist",
  loader: {},
  clean: true,
  ignoreTypes: false,
  import: [],
  minify: false,
  nodeOptions: [],
  reset: false,
  killSignal: "SIGTERM",
  run: false,
  tsconfig: "tsconfig.json",
  sourcemap: false,
  watch: false,
};
