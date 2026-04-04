import { existsSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { writeFile, mkdir as mkdirAsync } from "node:fs/promises";

export function exists(f: string): boolean {
  return existsSync(f);
}

export const text = {
  read(name: string): string {
    return readFileSync(name, "utf8");
  },
  write(name: string, content: string, opts?: { mode?: number }): Promise<void> {
    return writeFile(name, content, { mode: opts?.mode });
  },
};

async function mkdir(path: string): Promise<void> {
  await mkdirAsync(path, { recursive: true });
}

mkdir.sync = function (path: string): void {
  mkdirSync(path, { recursive: true });
};

export { mkdir };

export const json = {
  read<T = unknown>(name: string): T {
    return JSON.parse(readFileSync(name, "utf8")) as T;
  },
};

export function clean(dest: string): void {
  try {
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true });
    }
    mkdir.sync(dest);
  } catch {
    // ignore
  }
}
