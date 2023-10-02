import { Writable } from "stream";

export function nullStream() {
  return new Writable({
    write(chunk, enc, callback) {
      setImmediate(callback);
    },
  });
}
