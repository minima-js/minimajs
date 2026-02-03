import { z, ZodError } from "zod";
import { SchemaError, ValidationError } from "../error.js";
import { context, type Context } from "@minimajs/server";
import type { SchemaDataTypes } from "./schema.js";

const kSchemaMetadata = Symbol("minimajs.schema.metadata");

export interface SchemaMetadata<T = unknown> {
  type: SchemaDataTypes;
  schema: z.ZodTypeAny;
  callback: (ctx: Context) => Promise<T> | T;
}

export function setSchemaMetadata(cb: any, metadata: SchemaMetadata) {
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
  type: SchemaDataTypes
): () => z.infer<T> {
  const symbol = Symbol("minimajs.schema.data");
  function getData(): z.infer<T> {
    const { locals } = context();
    if (!locals[symbol]) {
      throw new SchemaError("Schema not register");
    }
    return locals[symbol] as z.infer<T>;
  }

  setSchemaMetadata(getData, {
    schema,
    type,
    callback: async ({ locals }) => {
      const val = await validateObjectAsync(schema, await data(), option);
      locals[symbol] = val;
    },
  });

  return getData;
}

async function validateObjectAsync(schema: z.ZodTypeAny, data: unknown, option?: ValidationOptions) {
  try {
    // If passthrough is true, allow unknown properties
    let finalSchema = schema;
    if (option?.stripUnknown === false && schema instanceof z.ZodObject) {
      finalSchema = schema.loose();
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
