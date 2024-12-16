import { Schema, type AnyObject, type Flags, type Maybe, type Message } from "@minimajs/schema";
import { UploadedFile } from "./uploaded-file.js";

type Rule = {
  minSize?: number;
  maxSize?: number;
  mimeTypes: string[];
};

export class FileSchema<
  TType extends Maybe<UploadedFile> = UploadedFile | undefined,
  TContext = AnyObject,
  TDefault = undefined,
  TFlags extends Flags = ""
> extends Schema<TType, TContext, TDefault, TFlags> {
  private $_rules: Rule = {
    mimeTypes: [],
  };

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

  size(min: number, max: number) {
    this.$_rules.maxSize = max;
    this.$_rules.minSize = min;
    return this;
  }

  accept(...type: string[]) {
    this.$_rules.mimeTypes = [...this.$_rules.mimeTypes, ...type];
    return this;
  }

  getRules() {
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
