import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config, ConfigFactory, ConfigEnv, CliPlugin, PluginsFactory } from "./types.js";
import { resolveConfig } from "./resolve.js";
import type { CliOption } from "../command.js";
import { exists } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { kFactoryFn } from "#/symbols.js";
import { runtime } from "#/runtime/index.js";
import { getOutputFilename } from "#/utils/path.js";
import { loadEnvFile } from "./env.js";

export type { Config };

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

const importConfig = cached(async () => {
  for (const ext of ["js", "ts"]) {
    const filename = `minimajs.config.${ext}`;
    const configPath = join(process.cwd(), filename);
    if (!exists(configPath)) continue;
    return { filename, module: await import(pathToFileURL(configPath).href) };
  }
  return null;
});

export const loadPlugins = cached(async (env: ConfigEnv): Promise<CliPlugin[]> => {
  const result = await importConfig();
  if (!result) return [];
  const { filename, module } = result;
  const factory = module.plugins;
  if (!factory) return [];
  if (typeof factory !== "function") {
    logger.warn(`"${filename}" plugins export must be a function or use definePlugins() — skipping.`);
    return [];
  }
  return (factory as PluginsFactory)(env);
});

export async function loadConfig(cliOption: CliOption): Promise<Config> {
  const { mode, grace, ...cliOverrides } = cliOption;
  const env: ConfigEnv = { mode, dev: mode === "dev" };

  let factory: ConfigFactory = () => resolveConfig({});

  const result = await importConfig();
  if (result) {
    const { filename, module } = result;
    if (typeof module.default !== "function") {
      logger.warn(`"${filename}" does not export a defineConfig() function — skipping.`);
    } else {
      factory = module.default;
      if (!(factory as any)[kFactoryFn]) {
        logger.warn(`Use defineConfig in "${filename}" to avoid unexpected configuration errors`);
      }
    }
  }

  const config = await factory(env);

  if (grace === false) {
    config.killSignal = "SIGKILL";
  }

  return { ...config, ...cliOverrides };
}
