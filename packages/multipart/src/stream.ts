import { Writable } from "stream";

export function nullStream() {
  return new Writable({
    write(_, __, callback) {
      setImmediate(callback);
    },
  });
}
