import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function getRunningFilePath(): string {
  // process.argv[1] is the path to the entry file
  const entryPoint = process.argv[1];
  
  if (!entryPoint) {
    // Fallback to process.cwd() if argv[1] is not available (e.g., REPL or eval)
    return process.cwd();
  }

  // Handle file:// URLs (can happen with ES modules)
  if (entryPoint.startsWith("file://")) {
    return dirname(fileURLToPath(entryPoint));
  }

  return dirname(entryPoint);
}
