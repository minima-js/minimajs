import { type Readable, Writable } from "node:stream";

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
    write(_, __, callback) {
      setImmediate(callback);
    },
  });
}
