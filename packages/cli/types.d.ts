import type { BuildOptions, Loader, Plugin } from "esbuild";

export interface MinimaPlugin extends Omit<Plugin, "setup"> {
  setup?: Plugin["setup"];
  entry?: string[];
}

type EsbuildOverrides = Omit<
  BuildOptions,
  "entryPoints" | "outdir" | "plugins" | "metafile" | "bundle" | "platform" | "format"
>;

interface BaseConfig {
  entry: string[];
  run: boolean;
  exec: string;
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
  target: string;
  envFile: string;
  plugins: MinimaPlugin[];
  esbuild: EsbuildOverrides;
  external: { include?: string[] };
}

export interface Config extends Partial<BaseConfig> {}

interface ConfigEnv {
  build: boolean;
  watch: boolean;
}

type ConfigFactory = (env: ConfigEnv) => Config;

export function defineConfig(config: Config): Config;
export function defineConfig(config: ConfigFactory): ConfigFactory;
