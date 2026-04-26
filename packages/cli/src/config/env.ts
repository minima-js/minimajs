import { parse } from "dotenv";
import dotenvExpand from "dotenv-expand";
import { resolve, isAbsolute } from "node:path";
import { readFileSync } from "node:fs";

export function loadEnvFile(filepath: string | string[]): Record<string, string> {
  if (Array.isArray(filepath)) {
    return filepath.reduce<Record<string, string>>((acc, f) => ({ ...acc, ...loadEnvFile(f) }), {});
  }
  const absolutePath = isAbsolute(filepath) ? filepath : resolve(process.cwd(), filepath);
  try {
    const parsed = parse(readFileSync(absolutePath, "utf8"));
    dotenvExpand.expand({ parsed, processEnv: {} });
    return parsed;
  } catch (err: any) {
    if (err.code === "ENOENT") return {};
    if (err.code === "EACCES")
      throw new Error(`Permission denied reading environment file: ${absolutePath}`, { cause: err });
    throw new Error(`Failed to read environment file at ${absolutePath}: ${err.message}`, { cause: err });
  }
}
