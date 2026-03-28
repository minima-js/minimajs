import type { BaseConfig } from "./types.js";

export const defaults: BaseConfig = {
  outdir: "dist",
  ext: ".js",
  polyfills: [],
  inject: [],
  loader: {},
  clean: true,
  format: "cjs",
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
