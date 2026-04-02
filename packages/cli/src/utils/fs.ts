import { existsSync, writeFileSync, rmSync, mkdirSync, readFileSync } from "node:fs";

export function isExists(f: string): boolean {
  return existsSync(f);
}

export const text = {
  read(name: string): string {
    return readFileSync(name, "utf8");
  },
  write(name: string, content: string): void {
    writeFileSync(name, content);
  },
};

export function clean(dest: string): void {
  try {
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true });
    }
    mkdirSync(dest, { recursive: true });
  } catch {
    // Ignore errors if directory doesn't exist or can't be cleaned
  }
}

export const json = {
  read<T = unknown>(name: string): T {
    return JSON.parse(readFileSync(name, "utf8")) as T;
  },
  write(name: string, content: unknown, indent = 2): void {
    writeFileSync(name, JSON.stringify(content, null, indent));
  },
};
