import { Transform, Writable, PassThrough, type Readable, type TransformCallback, type TransformOptions } from "node:stream";

class IteratorStream<T> extends PassThrough {
  constructor(opt: TransformOptions = {}) {
    super({ objectMode: true, ...opt });
  }
  writeAsync(val: T) {
    return new Promise<void>((resolve, reject) => {
      this.write(val, (err) => {
        err ? reject(err) : resolve();
      });
    });
  }
}

export function createIteratorAsync<T>(opt?: TransformOptions) {
  const stream = new IteratorStream<T>(opt);
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

export class StreamMeter extends Transform {
  bytes: number = 0;
  constructor(public maxBytes: number) {
    super();
  }

  _transform(chunk: any, _: BufferEncoding, callback: TransformCallback): void {
    this.bytes += chunk.length;
    this.push(chunk);
    if (this.bytes > this.maxBytes) {
      return callback(new RangeError("Stream exceeded specified max of " + this.maxBytes + " bytes."));
    }
    callback();
  }
}
