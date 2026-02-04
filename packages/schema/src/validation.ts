import { z, ZodError, ZodType } from "zod";
import { ValidationError } from "./error.js";
import type { SchemaDataTypes, SchemaValidator } from "./types.js";
import { kDataType, kSchema } from "./symbols.js";

export interface ValidationOptions {
  stripUnknown?: boolean;
}

/**
 * @internal
 */
export type DataCallback = () => unknown;

export function validator<T extends ZodType>(
  schema: T,
  data: DataCallback,
  option: ValidationOptions,
  type: SchemaDataTypes
): SchemaValidator<z.infer<T>> {
  function getData(): z.infer<T> {
    return validateSchema(schema, data(), option);
  }
  getData[kDataType] = type;
  getData[kSchema] = schema;
  return getData as SchemaValidator<z.infer<T>>;
}

export function validatorAsync<T extends ZodType>(
  schema: T,
  data: DataCallback,
  option: ValidationOptions,
  type: SchemaDataTypes
): SchemaValidator<Promise<z.infer<T>>> {
  function getData(): Promise<z.infer<T>> {
    return validateSchemaAsync(schema, data(), option);
  }

  getData[kDataType] = type;
  getData[kSchema] = schema;
  return getData as SchemaValidator<Promise<z.infer<T>>>;
}

function validateSchema<T extends z.ZodTypeAny>(schema: T, data: unknown, option: ValidationOptions): z.infer<T> {
  try {
    let finalSchema: z.ZodTypeAny = schema;
    if (option.stripUnknown === false && schema instanceof z.ZodObject) {
      finalSchema = schema.loose();
    }
    return finalSchema.parse(data) as z.infer<T>;
  } catch (err) {
    dealWithException(err);
  }
}

async function validateSchemaAsync<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  option: ValidationOptions
): Promise<z.infer<T>> {
  try {
    let finalSchema: z.ZodTypeAny = schema;
    if (option.stripUnknown === false && schema instanceof z.ZodObject) {
      finalSchema = schema.loose();
    }
    return (await finalSchema.parseAsync(data)) as z.infer<T>;
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
