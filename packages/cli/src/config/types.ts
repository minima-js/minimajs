import type { Loader } from "esbuild";

export type Runtime = "node" | "bun";
export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

export interface BaseConfig {
  entry: string[];
  run: boolean | string;
  watch: boolean;
  clean: boolean;
  sourcemap: boolean;
  tsconfig: string;
  minify: boolean;
  ignoreTypes: boolean;
  reset: boolean;
  killSignal: NodeJS.Signals;
  import: string[];
  outdir: string;
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
