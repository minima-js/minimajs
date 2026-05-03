import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { exists } from "../utils/fs.js";

let filename: string | null = null;
let mod: Record<string, unknown> | null = null;

for (const ext of ["js", "ts"]) {
  const f = `minimajs.config.${ext}`;
  const p = join(process.cwd(), f);
  if (exists(p)) {
    filename = f;
    mod = await import(pathToFileURL(p).href);
    break;
  }
}

export const configFilename = filename;
export const configModule = mod;
export const isCorepackEnabled: boolean = mod?.corepack === true;
