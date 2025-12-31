import { z, ZodError } from "zod";
import { SchemaError, ValidationError } from "./error.js";
import { context } from "@minimajs/server";
import type { SchemaLifecycleTypes } from "./schema.js";

const kSchemaMetadata = Symbol("minimajs.schema.metadata");

export interface SchemaMetadata<T = unknown> {
  type: SchemaLifecycleTypes;
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

export interface ValidationOptions {
  stripUnknown?: boolean;
}

export function validatorAsync<T extends z.ZodTypeAny>(
  schema: T,
  data: DataCallback,
  option: ValidationOptions | undefined,
  type: SchemaLifecycleTypes
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
    type,
    callback: async () => {
      const { locals } = context();
      const val = await validateObjectAsync(schema, data(), option);
      locals.set(symbol, val);
    },
  });

  return getData;
}

async function validateObjectAsync(schema: z.ZodTypeAny, data: unknown, option?: ValidationOptions) {
  try {
    // If passthrough is true, allow unknown properties
    let finalSchema = schema;
    if (option?.stripUnknown === false && schema._def?.typeName === "ZodObject") {
      finalSchema = (schema as any).passthrough();
    }

    return await finalSchema.parseAsync(data);
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
