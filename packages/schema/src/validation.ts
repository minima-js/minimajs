import { BaseHttpError } from "@minimajs/app/error";
import { object, type InferType, type ObjectShape, ObjectSchema } from "yup";
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
  if (err instanceof BaseHttpError || !(err instanceof Error)) {
    throw err;
  }
  throw new ValidationError(err);
}
