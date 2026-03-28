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

export function getEntry(opt: BuildOptions): string {
  if (!Array.isArray(opt.entryPoints) || opt.entryPoints.length === 0) {
    throw new Error("invalid entry");
  }
  return opt.entryPoints[0] as string;
}
