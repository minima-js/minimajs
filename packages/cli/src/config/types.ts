import type { BuildOptions, Loader, Plugin } from "esbuild";

export interface CliPlugin extends Omit<Plugin, "setup"> {
  setup?: Plugin["setup"];
  entry?: string[];
  commands?: Record<string, unknown>;
  generators?: Record<string, unknown>;
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
  exec: string;
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
  esbuild?: EsbuildOverrides;
}

export type ConfigMode = "dev" | "build" | "start";

export interface ConfigEnv {
  mode: ConfigMode;
  dev: boolean;
}

export interface CliOption extends Partial<BaseConfig> {
  grace?: boolean;
  mode: ConfigMode;
}

export interface Config extends BaseConfig {
  external?: { include?: string[] };
}

export type ConfigFactory = (env: ConfigEnv) => Promise<Config>;
export type PluginsFactory = (env: ConfigEnv) => CliPlugin[] | Promise<CliPlugin[]>;
