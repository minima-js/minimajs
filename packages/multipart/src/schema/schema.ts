import { Schema, type AnyObject, type Flags, type Maybe, type Message } from "@minimajs/schema";
import { UploadedFile } from "./uploaded-file.js";
import { humanFileSize } from "../helpers.js";
import { validateFileType } from "./validator.js";

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

  min(size: number, message?: Message<{ min: number }>) {
    const defaultMessage: Message<{ min: number }> = (params) => {
      return `The file ${params.path} is too small. Minimum size: ${humanFileSize(
        size
      )} bytes, actual size: ${humanFileSize(params.value.size)} bytes`;
    };

    return this.test({
      params: { min: size },
      message: message ?? defaultMessage,
      skipAbsent: true,
      test(value) {
        return value!.size > size;
      },
    });
  }

  max(size: number, message?: Message<{ max: number }>) {
    const defaultMessage: Message<{ min: number }> = (params) => {
      return `The file ${params.path} is too large. Maximum size: ${humanFileSize(
        size
      )} bytes, actual size: ${humanFileSize(params.value.size)} bytes`;
    };
    return this.test({
      params: { max: size },
      message: message ?? defaultMessage,
      skipAbsent: true,
      test(value) {
        return value!.size < size;
      },
    });
  }

  accept(type: string[], message?: Message<{ mimeType: string[] }>) {
    const defaultMessage: Message<{ mimeType: string[] }> = (params) => {
      return `Invalid file type: ${params.value.filename}. Allowed types are: ${params.mimeType.join(", ")}.`;
    };

    return this.test({
      params: { mimeType: type },
      message: message ?? defaultMessage,
      skipAbsent: true,
      test(value) {
        return validateFileType(value!, type);
      },
    });
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

export function isRequired(schema: Schema) {
  return schema.describe().tests.find((test) => test.name === "required");
}

export function getMaxSize(schema: Schema): number {
  const test = schema.describe().tests.find((test) => test.name === "max");
  if (test) {
    return test.params!.max as number;
  }
  return Infinity;
}
