import { Transform, type TransformCallback } from "node:stream";
import { EOL } from "node:os";
import { lines, startsWith } from "../helpers/buffer.js";

class Strip extends Transform {
  clearBuf = [
    Buffer.from(EOL),
    Buffer.from([0x1b, 0x5b, 0x32, 0x4a, 0x1b, 0x5b, 0x33, 0x4a, 0x1b, 0x5b, 0x48]),
    Buffer.from("\x1Bc"), // for older versions
  ];
  infoBuf = Buffer.from("[\x1B[90m");

  _transform(chunks: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    for (const chunk of lines(chunks)) {
      if (this.skip(chunk)) {
        continue;
      }
      this.push(chunk, encoding);
    }
    callback();
  }

  skip(chunk: Buffer): boolean {
    if (this.clearBuf.some((buf) => buf.equals(chunk))) {
      return true;
    }
    if (startsWith(chunk, this.infoBuf)) {
      return true;
    }
    return false;
  }
}

export function strip(): Strip {
  return new Strip();
}
