import { mkdir } from "fs/promises";
import { resolve } from "path";

const units = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"] as const;
export type Unit = (typeof units)[number];

export type Dict<T = any> = NodeJS.Dict<T>;

const thresh = 1024;

export function getBytes(size: number, multiplier: Unit) {
  for (const bn of units) {
    size *= thresh;
    if (multiplier === bn) {
      return size;
    }
  }
  return size;
}

export function humanFileSize(bytes: number, dp = 1) {
  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + " " + units[u];
}
export function set(obj: Record<PropertyKey, unknown>, key: PropertyKey, value: unknown) {
  obj[key] = value;
  return obj;
}

export async function ensurePath(...paths: string[]) {
  const dest = resolve(...paths);
  await mkdir(dest, { recursive: true });
  return dest;
}
