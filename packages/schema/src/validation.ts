import { z, ZodError } from "zod";
import { ValidationError } from "./error.js";

export interface ValidationOptions {
  stripUnknown?: boolean;
}

type DataCallback = () => unknown;

export function validator<T extends z.ZodTypeAny>(schema: T, data: DataCallback, option?: ValidationOptions) {
  return function getData(): z.infer<T> {
    return validateSchema(schema, data(), option);
  };
}

export function validatorAsync<T extends z.ZodTypeAny>(schema: T, data: DataCallback, option?: ValidationOptions) {
  return function getData(): Promise<z.infer<T>> {
    return validateSchemaAsync(schema, data(), option);
  };
}

function validateSchema(schema: z.ZodTypeAny, data: unknown, option?: ValidationOptions) {
  try {
    let finalSchema = schema;
    if (option?.stripUnknown === false && schema instanceof z.ZodObject) {
      finalSchema = schema.passthrough();
    }
    return finalSchema.parse(data);
  } catch (err) {
    dealWithException(err);
  }
}

async function validateSchemaAsync(schema: z.ZodTypeAny, data: unknown, option?: ValidationOptions) {
  try {
    let finalSchema = schema;
    if (option?.stripUnknown === false && schema instanceof z.ZodObject) {
      finalSchema = schema.passthrough();
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
