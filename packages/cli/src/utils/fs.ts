import { existsSync, rmSync, readFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { writeFile, mkdir as mkdirAsync } from "node:fs/promises";

export function exists(f: string): boolean {
  return existsSync(resolve(process.cwd(), f));
}

export const text = {
  read(name: string): string {
    return readFileSync(resolve(process.cwd(), name), "utf8");
  },
  write(name: string, content: string, opts?: { mode?: number }): Promise<void> {
    return writeFile(resolve(process.cwd(), name), content, { mode: opts?.mode });
  },
};

async function mkdir(path: string): Promise<void> {
  await mkdirAsync(resolve(process.cwd(), path), { recursive: true });
}

mkdir.sync = function (path: string): void {
  mkdirSync(resolve(process.cwd(), path), { recursive: true });
};

export { mkdir };

export const json = {
  read<T = unknown>(name: string): T {
    return JSON.parse(readFileSync(resolve(process.cwd(), name), "utf8")) as T;
  },
};

export function clean(dest: string): void {
  dest = resolve(process.cwd(), dest);
  try {
    if (existsSync(dest)) {
      rmSync(dest, { recursive: true });
    }
    mkdir.sync(dest);
  } catch {
    // ignore
  }
}
