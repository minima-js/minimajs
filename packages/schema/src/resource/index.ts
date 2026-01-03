import { z } from "zod";
import { type Context } from "@minimajs/server";
import { validatorAsync, type ValidationOptions } from "./validation.js";

export * from "./schema.js";

function getSearchParams({ url }: Context) {
  return Object.fromEntries(url.searchParams);
}

function getParams({ route }: Context) {
  return route?.params ?? {};
}

function getBody({ request }: Context) {
  return request.json();
}

function getHeaders({ request }: Context) {
  return Object.fromEntries(request.headers);
}

export function createBody<T extends z.ZodTypeAny>(schema: T, option?: ValidationOptions): () => z.infer<T> {
  return validatorAsync(schema, getBody, option, "body");
}

export function createHeaders<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), getHeaders, option, "headers");
}

export function createSearchParams<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), getSearchParams, option, "searchParams");
}

export function createParams<T extends z.ZodRawShape>(schema: T, option?: ValidationOptions) {
  return validatorAsync(z.object(schema), getParams, option, "params");
}

export { type ValidationOptions } from "./validation.js";
