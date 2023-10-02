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

export function asyncIterator<T>(opt?: TransformOptions) {
  const stream = new IteratorStream<T>({
    ...opt,
    objectMode: true,
  });
  async function* iterator() {
    for await (const data of stream) {
      yield data as T;
    }
  }
  return [stream, iterator] as const;
}
