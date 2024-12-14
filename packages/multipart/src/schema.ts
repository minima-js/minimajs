import { Schema, type AnyObject, type Flags, type Maybe, type Message } from "yup";
import {} from "yup";
import type { UploadedFile } from "./unstable.js";

export class FileSchema<
  TType extends Maybe<UploadedFile> = UploadedFile | undefined,
  TContext = AnyObject,
  TDefault = undefined,
  TFlags extends Flags = ""
> extends Schema<TType, TContext, TDefault, TFlags> {
  #size?: number;
  #mimeType?: string;
  constructor() {
    super({
      type: "string",
      check(value): value is NonNullable<TType> {
        if (value instanceof String) value = value.valueOf();
        return typeof value === "string";
      },
    });
  }

  fileSize(size: number) {
    this.#size = size;
    return this;
  }

  mimeType(type: string) {
    this.#mimeType = type;
    return this;
  }

  getMimeType() {
    return this.#mimeType;
  }

  getSize() {
    return this.#size;
  }

  required(message?: Message<any>) {
    return super.required(message).withMutation((schema: this) =>
      schema.test({
        message: message || "${path} is a required field",
        name: "required",
        skipAbsent: true,
        test: (value) => !!value,
      })
    );
  }
}

export interface FileSchema<
  TType extends Maybe<UploadedFile> = UploadedFile | undefined,
  TContext = AnyObject,
  TDefault = undefined,
  TFlags extends Flags = ""
> extends Schema<TType, TContext, TDefault, TFlags> {
  required(msg?: Message): FileSchema<NonNullable<TType>, TContext, TDefault, TFlags>;
}

// export function file() {
//   return new FileSchema();
// }

function file(): FileSchema;
function file<T extends UploadedFile, TContext extends Maybe<AnyObject> = AnyObject>(): FileSchema<
  T | undefined,
  TContext
>;
function file() {
  return new FileSchema();
}

export { file };
