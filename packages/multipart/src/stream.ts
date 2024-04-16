import { type Readable, Writable } from "node:stream";

import { PassThrough, type TransformOptions } from "node:stream";

class IteratorStream<T> extends PassThrough {
  writeAsync(val: T) {
    return new Promise<void>((resolve, reject) => {
      this.write(val, undefined, (err) => {
        err ? reject(err) : resolve();
      });
    });
  }
}

export function createIteratorAsync<T>(opt?: TransformOptions) {
  const stream = new IteratorStream<T>({
    ...opt,
    objectMode: true,
  });
  return [stream, () => stream as unknown as AsyncGenerator<T>] as const;
}

export async function stream2buffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const buf = Array<Buffer>();
    stream.on("data", (chunk) => buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(buf)));
    stream.on("error", reject);
  });
}

export function stream2void() {
  return new Writable({
    write(_, _1, callback) {
      setImmediate(callback);
    },
  });
}
