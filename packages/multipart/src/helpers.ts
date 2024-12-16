const units = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"] as const;
export type Unit = (typeof units)[number];

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

export function assertError<T>(err: unknown, Type: new (...args: any[]) => T): asserts err is T {
  if (err instanceof Type) {
    return;
  }
  throw err;
}
