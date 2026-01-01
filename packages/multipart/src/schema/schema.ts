import { z } from "zod";
import { UploadedFile } from "./uploaded-file.js";
import { humanFileSize } from "../helpers.js";
import { validateFileType } from "./validator.js";

export type ExtractTest = { max?: number; accept?: string[] };
export type ExtractTests = Record<string, ExtractTest>;

export type FileBuilder = {
  schema: z.ZodType<UploadedFile | undefined>;
  _meta?: ExtractTest & { isFile?: true };
  max(size: number, message?: string): FileBuilder;
  accept(types: string[], message?: string): FileBuilder;
  required(message?: string): FileBuilder;
  toZod(): z.ZodType<UploadedFile | undefined>;
};

function attachMeta(builder: FileBuilder, meta: Partial<ExtractTest> & { isFile?: true }) {
  builder._meta = Object.assign({}, builder._meta || {}, meta);
  return builder;
}

/**
 * Create a Zod schema for UploadedFile with chainable helper methods via refinements.
 */
function file(): FileBuilder {
  let schema: z.ZodTypeAny = z.instanceof(UploadedFile).optional();

  // we'll create a builder object that wraps the zod schema and stores metadata
  let builder!: FileBuilder;

  const max = (size: number, message?: string) => {
    const defaultMessage = (val: any) =>
      `The file ${val?.field} is too large. Maximum size: ${humanFileSize(size)} bytes, actual size: ${humanFileSize(
        val?.size
      )} bytes`;
    schema = schema.refine((v: any) => v === undefined || v.size <= size, {
      message: message ?? (defaultMessage as any),
    });
    attachMeta(builder, { max: size, isFile: true });
    builder.schema = schema as any;
    return builder;
  };

  const accept = (types: string[], message?: string) => {
    const defaultMessage = (val: any) => `Invalid file type: ${val?.filename}. Allowed types are: ${types.join(", ")}.`;
    schema = schema.refine((v: any) => v === undefined || validateFileType(v, types), {
      message: message ?? (defaultMessage as any),
    });
    attachMeta(builder, { accept: types, isFile: true });
    builder.schema = schema as any;
    return builder;
  };

  const required = (message?: string) => {
    schema = schema.refine((v: any) => !!v, { message: message ?? ("${path} is a required field" as any) });
    attachMeta(builder, { isFile: true });
    builder.schema = schema as any;
    return builder;
  };

  builder = {
    schema: schema as any,
    _meta: undefined,
    max,
    accept,
    required,
    toZod() {
      return this.schema;
    },
  };
  return builder;
}

export { file };

export function extractTests(obj: Record<string, any> | any) {
  const tests: ExtractTests = {};
  // If a zod object is passed, get its shape
  const shape = obj && obj._def && typeof obj._def.shape === "function" ? obj._def.shape() : obj;

  for (const [key, value] of Object.entries(shape)) {
    tests[key] = {};
    // builder with metadata
    if (value && typeof value === "object" && "_meta" in value && (value as any)._meta) {
      const m = (value as any)._meta as ExtractTest | undefined;
      if (m?.max) tests[key].max = m.max;
      if (m?.accept) tests[key].accept = m.accept;
      continue;
    }

    // legacy: zod-attached __multipart
    const meta = (value as any).__multipart;
    if (meta) {
      if (meta.max) tests[key].max = meta.max;
      if (meta.accept) tests[key].accept = meta.accept;
    }

    // array of files (if inner schema had metadata attached via legacy method)
    const inner = (value as any)?._def?.type;
    if (inner && (inner as any).__multipart) {
      const im = (inner as any).__multipart;
      if (im.max) tests[key].max = im.max;
      if (im.accept) tests[key].accept = im.accept;
    }
  }
  return tests;
}

export function getTestMaxSize(test: ExtractTest | undefined): number {
  if (!test) return Infinity;
  return test.max ?? Infinity;
}
