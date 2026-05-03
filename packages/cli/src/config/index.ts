import type { Config, ConfigFactory, ConfigEnv, CliPlugin, PluginsFactory } from "./types.js";
import { resolveConfig } from "./resolve.js";
import type { CliOption } from "../command.js";
import { logger } from "#/utils/logger.js";
import { kFactoryFn } from "#/symbols.js";
import { runtime } from "#/runtime/index.js";
import { getOutputFilename } from "#/utils/path.js";
import { loadEnvFile } from "./env.js";
import { configFilename, configModule } from "./loader.js";

export type { Config };
export { isCorepackEnabled } from "./loader.js";

function cached<TArgs extends unknown[], T>(fn: (...args: TArgs) => Promise<T>): (...args: TArgs) => Promise<T> {
  let promise: Promise<T> | undefined;
  return (...args) => (promise ??= fn(...args));
}

export function resolveRunCommand(config: Config, outputFile: string) {
  const { exec, sourcemap, import: imports, outdir, envFile } = config;
  const cmd = exec ? exec.replace("[filename]", outputFile) : `${runtime.bin(runtime.detect())} ${outputFile}`;
  const [bin, ...userArgs] = cmd.trim().split(/\s+/);

  const args: string[] = [];
  if (sourcemap && runtime.isNode(bin!)) args.push("--enable-source-maps");
  args.push(...imports.flatMap((x) => ["--import", getOutputFilename(x, outdir)]));
  const env = { ...process.env, ...(envFile ? loadEnvFile(envFile) : undefined) };
  return { bin: bin!, env, args: [...args, ...userArgs] };
}

export const loadPlugins = cached(async (env: ConfigEnv): Promise<CliPlugin[]> => {
  if (!configFilename || !configModule) return [];
  const factory = configModule.plugins;
  if (!factory) return [];
  if (typeof factory !== "function") {
    logger.warn(`"${configFilename}" plugins export must be a function or use definePlugins() — skipping.`);
    return [];
  }
  return (factory as PluginsFactory)(env);
});

export async function loadConfig(cliOption: CliOption): Promise<Config> {
  const { mode, grace, ...cliOverrides } = cliOption;
  const env: ConfigEnv = { mode, dev: mode === "dev" };

  let factory: ConfigFactory = () => resolveConfig({});

  if (configFilename && configModule) {
    if (typeof configModule.default !== "function") {
      logger.warn(`"${configFilename}" does not export a defineConfig() function — skipping.`);
    } else {
      factory = configModule.default as ConfigFactory;
      if (!(factory as any)[kFactoryFn]) {
        logger.warn(`Use defineConfig in "${configFilename}" to avoid unexpected configuration errors`);
      }
    }
  }

  const config = await factory(env);

  if (grace === false) {
    config.killSignal = "SIGKILL";
  }

  return { ...config, ...cliOverrides };
}
