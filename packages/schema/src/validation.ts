import {
  object,
  type InferType,
  type ObjectShape,
  ObjectSchema,
  ValidationError as ValidationBaseError,
  type ValidateOptions,
} from "yup";
import { ValidationError } from "./error.js";

type DataCallback = () => unknown;
export function validator<T extends ObjectShape>(obj: T, data: DataCallback, option: ValidateOptions) {
  const schema = object(obj);
  return function getData(): InferType<typeof schema> {
    return validateObject(schema, data(), option);
  };
}

export function validatorAsync<T extends ObjectShape>(obj: T, data: DataCallback, option: ValidateOptions) {
  const schema = object(obj);
  return function getData(): Promise<InferType<typeof schema>> {
    return validateObjectAsync(schema, data(), option);
  };
}

function validateObject(schema: ObjectSchema<any>, data: unknown, option: ValidateOptions) {
  try {
    return schema.validateSync(data, option);
  } catch (err) {
    dealWithException(err);
  }
}

async function validateObjectAsync(schema: ObjectSchema<any>, data: unknown, option: ValidateOptions) {
  try {
    return await schema.validate(data, option);
  } catch (err) {
    dealWithException(err);
  }
}
function dealWithException(err: unknown): never {
  if (err instanceof ValidationBaseError) {
    throw ValidationError.createFromBase(err);
  }
  throw err;
}
