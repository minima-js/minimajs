import { Schema, ArraySchema, type ObjectShape, type AnyObject, type Flags, type Maybe, type Message } from "yup";
import { UploadedFile } from "./uploaded-file.js";
import { humanFileSize } from "../helpers.js";
import { validateFileType } from "./validator.js";

export type Test = Schema["tests"][0];

/**
 * Yup schema for validating uploaded files.
 * Provides validation methods for file size and MIME type.
 *
 * @example
 * ```ts
 * import { file } from '@minimajs/multipart/schema';
 *
 * const schema = file()
 *   .required()
 *   .max(5 * 1024 * 1024) // 5MB
 *   .accept(['image/png', 'image/jpeg']);
 * ```
 */
export class FileSchema<
  TType extends Maybe<UploadedFile> = UploadedFile | undefined,
  TContext = AnyObject,
  TDefault = undefined,
  TFlags extends Flags = ""
> extends Schema<TType, TContext, TDefault, TFlags> {
  constructor() {
    super({
      type: UploadedFile.name,
      check(value): value is NonNullable<TType> {
        return value instanceof UploadedFile;
      },
    });
  }

  /**
   * Validates that the file size is at least the specified minimum in bytes.
   *
   * @example
   * ```ts
   * file().min(1024) // At least 1KB
   * ```
   */
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

  /**
   * Validates that the file size does not exceed the specified maximum in bytes.
   *
   * @example
   * ```ts
   * file().max(5 * 1024 * 1024) // Max 5MB
   * ```
   */
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

  /**
   * Validates that the file MIME type matches one of the allowed types.
   *
   * @example
   * ```ts
   * file().accept(['image/png', 'image/jpeg'])
   * file().accept(['application/pdf'])
   * ```
   */
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

  /**
   * Marks the file field as required.
   *
   * @example
   * ```ts
   * file().required('Avatar is required')
   * ```
   */
  required(message?: Message<any>) {
    return super.required(message).withMutation((schema: this) => {
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

/**
 * Creates a new FileSchema instance for validating uploaded files.
 *
 * @example
 * ```ts
 * import { file, createMultipartUpload } from '@minimajs/multipart/schema';
 * import { string } from 'yup';
 *
 * const upload = createMultipartUpload({
 *   name: string().required(),
 *   avatar: file()
 *     .required()
 *     .max(5 * 1024 * 1024)
 *     .accept(['image/png', 'image/jpeg'])
 * });
 *
 * const data = await upload();
 * ```
 */
function file(): FileSchema;
function file<T extends UploadedFile, TContext extends Maybe<AnyObject> = AnyObject>(): FileSchema<
  T | undefined,
  TContext
>;
function file() {
  return new FileSchema();
}

export { file };

export interface ExtractTest {
  max?: Test;
  accept?: Test;
}
export type ExtractTests = Record<string, ExtractTest>;

export function extractTests<T extends ObjectShape>(obj: T) {
  const tests: ExtractTests = {};

  function filterTest(test: Test, key: string) {
    if (test.OPTIONS?.name === "max") {
      tests[key]!.max = test;
      return false;
    }
    if (test.OPTIONS?.name === "accept") {
      tests[key]!.accept = test;
      return false;
    }
    return true;
  }

  for (const [key, value] of Object.entries(obj)) {
    tests[key] = {};
    if (value instanceof ArraySchema && value.innerType instanceof FileSchema) {
      value.innerType.tests = value.innerType.tests.filter((x) => filterTest(x, key));
    }
    if (value instanceof FileSchema) {
      value.tests = value.tests.filter((x) => filterTest(x, key));
    }
  }
  return tests;
}

export function getTestMaxSize(test: Test | undefined): number {
  if (!test) return Infinity;
  return (test.OPTIONS?.params?.max as number) ?? (Infinity as number);
}
