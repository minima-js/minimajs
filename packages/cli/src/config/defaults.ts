import type { BaseConfig } from "./types.js";

export const defaults: BaseConfig = {
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
