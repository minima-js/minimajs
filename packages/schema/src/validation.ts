import {
  object,
  type InferType,
  type ObjectShape,
  ObjectSchema,
  ValidationError as BaseError,
} from "yup";
import { ValidationError } from "./error.js";

type DataCallback = () => unknown;
export function validator<T extends ObjectShape>(obj: T, data: DataCallback) {
  const schema = object(obj);
  return function getData(): InferType<typeof schema> {
    return validateObject(schema, data());
  };
}

export function validatorAsync<T extends ObjectShape>(
  obj: T,
  data: DataCallback
) {
  const schema = object(obj);
  return function getData(): Promise<InferType<typeof schema>> {
    return validateObjectAsync(schema, data());
  };
}

function validateObject(schema: ObjectSchema<any>, data: unknown) {
  try {
    return schema.validateSync(data);
  } catch (err) {
    dealWithException(err);
  }
}

async function validateObjectAsync(schema: ObjectSchema<any>, data: unknown) {
  try {
    return await schema.validate(data);
  } catch (err) {
    dealWithException(err);
  }
}
function dealWithException(err: unknown): never {
  if (err instanceof BaseError) {
    throw new ValidationError(err);
  }
  throw err;
}
