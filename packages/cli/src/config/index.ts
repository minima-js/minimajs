import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Config, ConfigFactory, ConfigEnv } from "./types.js";
import { resolveConfig } from "./resolve.js";
import type { CliOption } from "../command.js";
import { exists } from "#/utils/fs.js";
import { logger } from "#/utils/logger.js";
import { kFactoryFn } from "#/symbols.js";
import { runtime } from "#/runtime/index.js";
import { getOutputFilename } from "#/utils/path.js";
import { loadEnvFile } from "./env.js";

export type { Config };

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

export async function loadConfig(cliOption: CliOption): Promise<Config> {
  const { mode, grace, ...cliOverrides } = cliOption;
  const env: ConfigEnv = { mode, dev: mode === "dev" };

  let factory: ConfigFactory = () => resolveConfig({});

  for (const ext of ["js", "ts"]) {
    const filename = `minimajs.config.${ext}`;
    const configPath = join(process.cwd(), filename);
    if (!exists(configPath)) continue;
    const module = await import(pathToFileURL(configPath).href);
    if (typeof module.default !== "function") {
      logger.warn(`"${filename}" does not export a defineConfig() function — skipping.`);
      continue;
    }
    factory = module.default;
    if (!(factory as any)[kFactoryFn]) {
      logger.warn(`Use defineConfig in "${filename}" to avoid unexpected configuration errors`);
    }
    break;
  }

  const config = await factory(env);

  if (grace === false) {
    config.killSignal = "SIGKILL";
  }

  return { ...config, ...cliOverrides, watch: mode === "dev" };
}
