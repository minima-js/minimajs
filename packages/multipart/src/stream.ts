import { PassThrough, Transform, type TransformCallback } from "node:stream";

export interface TypedStream<T> extends PassThrough {
  write(chunk: T): boolean;
  end(): this;
  emit(event: "error", error: unknown): boolean;
}
export function createAsyncIterator<T>() {
  const stream = new PassThrough({ objectMode: true, highWaterMark: 16 });
  return [stream as TypedStream<T>, stream as unknown as AsyncGenerator<T>] as const;
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
