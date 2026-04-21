import type { BuildOptions } from "esbuild";

export function getEntryLabel(opt: BuildOptions): string {
  if (!Array.isArray(opt.entryPoints) || opt.entryPoints.length === 0) {
    throw new Error("invalid entry");
  }
  const entries = opt.entryPoints as string[];
  const first = entries[0] ?? "";
  if (entries.length === 1) return first;
  return `${first} (+${entries.length - 1} module${entries.length - 1 > 1 ? "s" : ""})`;
}
