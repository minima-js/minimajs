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

function validateSchema<T extends z.ZodTypeAny>(schema: T, data: unknown, option?: ValidationOptions): z.infer<T> {
  try {
    let finalSchema: z.ZodTypeAny = schema;
    if (option?.stripUnknown === false && schema instanceof z.ZodObject) {
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
  option?: ValidationOptions
): Promise<z.infer<T>> {
  try {
    let finalSchema: z.ZodTypeAny = schema;
    if (option?.stripUnknown === false && schema instanceof z.ZodObject) {
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
