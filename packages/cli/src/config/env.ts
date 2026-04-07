import { config as dotenvConfig } from "dotenv";
import dotenvExpand from "dotenv-expand";
import { resolve, isAbsolute } from "node:path";

export function loadEnvFile(filepath: string): Record<string, string> {
  const absolutePath = isAbsolute(filepath) ? filepath : resolve(process.cwd(), filepath);
  const result = dotenvConfig({ path: absolutePath, quiet: true });
  if (result.error) {
    const errorMsg = result.error.message;
    if (errorMsg.includes("ENOENT")) {
      // File doesn't exist — only warn, don't throw (file may be optional)
      return {};
    }
    if (errorMsg.includes("EACCES")) {
      throw new Error(`Permission denied reading environment file: ${absolutePath}`);
    }
    throw new Error(`Failed to parse environment file at ${absolutePath}: ${errorMsg}`);
  }
  dotenvExpand.expand(result);
  return result.parsed ?? {};
}
