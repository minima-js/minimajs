import type { Format, Loader } from "esbuild";

export type Polyfill = "cjs";

export interface BaseConfig {
  run: boolean | string;
  watch: boolean;
  clean: boolean;
  sourcemap: boolean;
  tsconfig: string;
  minify: boolean;
  ignoreTypes: boolean;
  reset: boolean;
  nodeOptions: string[];
  killSignal: NodeJS.Signals;
  import: string[];
  outdir: string;
  format: Format;
  ext: string;
  polyfills: Polyfill[];
  inject: string[];
  loader: Record<string, Loader>;
  target?: string;
  envFile?: string;
}

export interface CliOption extends Partial<BaseConfig> {
  grace?: boolean;
}

export interface Config extends BaseConfig {
  external?: { include?: string[] };
}
