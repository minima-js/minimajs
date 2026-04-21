import { config as dotenvConfig } from "dotenv";
import dotenvExpand from "dotenv-expand";
import { resolve, isAbsolute } from "node:path";

export function loadEnvFile(filepath: string): Record<string, string> {
  const absolutePath = isAbsolute(filepath) ? filepath : resolve(process.cwd(), filepath);
  const result = dotenvConfig({ path: absolutePath, quiet: true });
  if (result.error) {
    const msg = result.error.message;
    if (msg.includes("ENOENT")) return {};
    if (msg.includes("EACCES")) throw new Error(`Permission denied reading environment file: ${absolutePath}`);
    throw new Error(`Failed to parse environment file at ${absolutePath}: ${msg}`);
  }
  dotenvExpand.expand(result);
  return result.parsed ?? {};
}
