import type { BuildOptions } from "esbuild";

export function ensureCase<T extends Record<string, unknown>>(data: T, ...args: (keyof T)[]): T {
  for (const name of args) {
    const value = data[name];
    if (!value) continue;
    if (typeof value === "string") {
      data[name] = value.toLowerCase() as T[keyof T];
    }
  }
  return data;
}

/** Returns the first entry point path (used for the run plugin output filename). */
export function getEntry(opt: BuildOptions): string {
  if (!Array.isArray(opt.entryPoints) || opt.entryPoints.length === 0) {
    throw new Error("invalid entry");
  }
  return opt.entryPoints[0] as string;
}

/** Returns a human-readable label for all entry points, e.g. "src/index.ts, src/users/module.ts" */
export function getEntryLabel(opt: BuildOptions): string {
  if (!Array.isArray(opt.entryPoints) || opt.entryPoints.length === 0) {
    throw new Error("invalid entry");
  }
  const entries = opt.entryPoints as string[];
  const first = entries[0] ?? "";
  if (entries.length === 1) return first;
  return `${first} (+${entries.length - 1} module${entries.length - 1 > 1 ? "s" : ""})`;
}
