import { Writable } from "stream";

export function stream2null() {
  return new Writable({
    write(_, __, callback) {
      setImmediate(callback);
    },
  });
}
