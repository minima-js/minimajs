import { PassThrough, Readable } from "stream";
import { stream2buffer } from "./helpers.js";

export class File {
  constructor(
    public readonly field: string,
    public readonly filename: string,
    public readonly encoding: string,
    public readonly mimeType: string,
    public readonly stream: Readable
  ) {}

  buffer() {
    return stream2buffer(this.stream);
  }

  end() {
    this.stream.pipe(new PassThrough({ objectMode: true }).end());
  }
}

export class Field {
  constructor(public readonly name: string, public readonly value: any) {}
}
