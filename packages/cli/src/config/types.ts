import type { BuildOptions, Loader, Plugin } from "esbuild";

export interface MinimaPlugin extends Omit<Plugin, "setup"> {
  setup?: Plugin["setup"];
  entry?: string[];
}

type EsbuildOverrides = Omit<
  BuildOptions,
  "entryPoints" | "outdir" | "plugins" | "metafile" | "bundle" | "platform" | "format"
>;

export type Runtime = "node" | "bun";
export type PackageManager = "bun" | "pnpm" | "yarn" | "npm";

export interface BaseConfig {
  entry: string[];
  run: boolean;
  exec?: string;
  watch: boolean;
  clean: boolean;
  sourcemap: boolean;
  tsconfig: string;
  minify: boolean;
  check: boolean;
  reset: boolean;
  killSignal: NodeJS.Signals;
  import: string[];
  outdir: string;
  loader: Record<string, Loader>;
  target?: string;
  envFile?: string | string[];
  plugins?: MinimaPlugin[];
  esbuild?: EsbuildOverrides;
}

export interface ConfigEnv {
  build: boolean;
  watch: boolean;
}

export interface CliOption extends Partial<BaseConfig> {
  grace?: boolean;
  build?: boolean;
}

export interface Config extends BaseConfig {
  external?: { include?: string[] };
}

export type ConfigFactory = (env: ConfigEnv) => Promise<Config>;
