import { Schema, type AnyObject, type Flags, type Maybe, type Message } from "yup";
import { UploadedFile } from "./unstable.js";

type Rule = {
  minSize?: number;
  maxSize?: number;
  mimetype?: string;
};
export class FileSchema<
  TType extends Maybe<UploadedFile> = UploadedFile | undefined,
  TContext = AnyObject,
  TDefault = undefined,
  TFlags extends Flags = ""
> extends Schema<TType, TContext, TDefault, TFlags> {
  private $_rules: Rule = {};

  constructor() {
    super({
      type: UploadedFile.name,
      check(value): value is NonNullable<TType> {
        return value instanceof UploadedFile;
      },
    });
  }

  minSize(size: number) {
    this.$_rules.minSize = size;
    return this;
  }

  maxSize(size: number) {
    this.$_rules.maxSize = size;
    return this;
  }

  mimeType(type: string) {
    this.$_rules.mimetype = type;
    return this;
  }

  getAllRules() {
    return this.$_rules;
  }

  required(message?: Message<any>) {
    return super.required(message).withMutation((schema: this) => {
      schema.$_rules = this.$_rules;
      return schema.test({
        message: message || "${path} is a required field",
        name: "required",
        skipAbsent: true,
        test: (value) => !!value,
      });
    });
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

function file(): FileSchema;
function file<T extends UploadedFile, TContext extends Maybe<AnyObject> = AnyObject>(): FileSchema<
  T | undefined,
  TContext
>;
function file() {
  return new FileSchema();
}

export { file };
