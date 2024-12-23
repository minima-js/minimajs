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
      name: "min",
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
      name: "max",
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
      name: "accept",
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

export function getMaxTest(schema: FileSchema) {
  const test = schema.tests.find((x) => x.OPTIONS?.name === "max");
  if (!test) {
    return [null, Infinity] as const;
  }
  return [test, test.OPTIONS!.params!.max as number] as const;
}

export function getAcceptanceTest(schema: FileSchema) {
  return schema.tests.find((x) => x.OPTIONS?.name === "accept");
}
