import { PassThrough } from "node:stream";

class IteratorStream<T> extends PassThrough {
  writeAsync(val: T) {
    return new Promise<void>((resolve, reject) => {
      this.write(val, undefined, (err) => (err ? reject(err) : resolve()));
    });
  }
}

export function asyncIterator<T>() {
  const stream = new IteratorStream<T>({
    objectMode: true,
  });
  async function* iterator() {
    for await (const data of stream) {
      yield data as T;
    }
  }
  return [stream, iterator] as const;
}
