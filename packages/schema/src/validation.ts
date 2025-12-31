import { z, ZodError, type ParseParams } from "zod";
import { SchemaError, ValidationError } from "./error.js";
import { context } from "@minimajs/server";

const kSchemaMetadata = Symbol("minimajs.schema.metadata");
z.array(z.string(), {
  description: "hello",
});

export interface SchemaMetadata<T = unknown> {
  schema: z.ZodTypeAny;
  callback: () => Promise<T> | T;
}
export function setScehmaMetadata(cb: any, metadata: SchemaMetadata) {
  cb[kSchemaMetadata] = metadata;
}
export function getSchemaMetadata(cb: any): SchemaMetadata {
  return cb[kSchemaMetadata];
}

/**
 * Callback function that returns data to be validated.
 */
export type DataCallback = () => unknown;

export function validatorAsync<T extends z.ZodTypeAny>(
  schema: T,
  data: DataCallback,
  option?: ParseParams
): () => z.infer<T> {
  const symbol = Symbol("minimajs.schema");
  function getData(): z.infer<T> {
    const { locals } = context();
    if (!locals.has(symbol)) {
      throw new SchemaError("Schema not register");
    }
    return locals.get(symbol)!;
  }
  setScehmaMetadata(getData, {
    schema,
    callback: () => validateObjectAsync(schema, data(), option),
  });

  return getData;
}

async function validateObjectAsync(schema: z.ZodTypeAny, data: unknown, option?: ParseParams) {
  try {
    return await schema.parseAsync(data, option);
  } catch (err) {
    dealWithException(err);
  }
}

function dealWithException(err: unknown): never {
  if (err instanceof ZodError) {
    throw ValidationError.createFromZodError(err);
  }
  throw err;
}
