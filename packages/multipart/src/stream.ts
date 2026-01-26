import { PassThrough, Transform, Writable, type Readable, type TransformCallback } from "node:stream";

export interface TypedStream<T> extends PassThrough {
  write(chunk: T): boolean;
  end(): this;
  emit(event: "error", error: unknown): boolean;
}
export function createAsyncIterator<T>() {
  const stream = new PassThrough({ objectMode: true, highWaterMark: 16 });
  return [stream as TypedStream<T>, stream as unknown as AsyncGenerator<T>] as const;
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
      callback();
    },
  });
}

export interface Stream2uint8arrayOptions {
  maxSize?: number;
}
export async function stream2uint8array(
  stream: Readable,
  { maxSize = Infinity }: Stream2uint8arrayOptions
): Promise<Uint8Array<ArrayBuffer>> {
  let buffer = new Uint8Array(64 * 1024); // 64KB
  let length = 0;

  for await (const chunk of stream) {
    // normalize chunk
    const uint8 = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);

    const needed = length + uint8.byteLength;

    if (needed > maxSize) {
      stream.destroy();
      throw new Error("Body exceeds maxSize");
    }

    // grow buffer (amortized O(n))
    if (needed > buffer.byteLength) {
      let newSize = buffer.byteLength;
      while (newSize < needed) {
        newSize *= 2;
      }

      const next = new Uint8Array(newSize);
      next.set(buffer, 0);
      buffer = next;
    }

    buffer.set(uint8, length);
    length += uint8.byteLength;
  }

  return buffer.subarray(0, length);
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
