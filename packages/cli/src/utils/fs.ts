import { existsSync, rmSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { writeFile, mkdir as mkdirAsync } from "node:fs/promises";

export function exists(f: string): boolean {
  return existsSync(resolve(process.cwd(), f));
}

export async function text(name: string): Promise<string> {
  return readFileSync(resolve(process.cwd(), name), "utf8");
}

async function write(name: string, content: string, opts?: { mode?: number; ensuredir?: boolean }): Promise<string> {
  const path = resolve(process.cwd(), name);
  if (opts?.ensuredir) mkdirSync(dirname(path), { recursive: true });
  await writeFile(path, content, { mode: opts?.mode });
  return name;
}

write.sync = function writeSync(name: string, content: string, opts?: { mode?: number; ensuredir?: boolean }): string {
  const path = resolve(process.cwd(), name);
  if (opts?.ensuredir) mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, { mode: opts?.mode });
  return name;
};

text.write = write;

text.sync = function syncText(name: string) {
  return readFileSync(resolve(process.cwd(), name), "utf8");
};

export async function mkdir(path: string): Promise<void> {
  await mkdirAsync(resolve(process.cwd(), path), { recursive: true });
}

mkdir.sync = function (path: string): void {
  mkdirSync(resolve(process.cwd(), path), { recursive: true });
};

export async function json<T = unknown>(name: string) {
  return JSON.parse(await text(name)) as T;
}

json.sync = function readJSONSync<T = unknown>(name: string) {
  return JSON.parse(text.sync(name)) as T;
};

export function clean(dest: string): void {
  dest = resolve(process.cwd(), dest);
  try {
    if (exists(dest)) {
      rmSync(dest, { recursive: true });
    }
    mkdir.sync(dest);
  } catch {
    // ignore
  }
}
