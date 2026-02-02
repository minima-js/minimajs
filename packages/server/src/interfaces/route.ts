import type { FindResult, HTTPMethod } from "find-my-way";
import type { App, Handler } from "./app.js";
import type { kRequestSchema, kResponseSchema } from "../symbols.js";
import type { JSONSchema7 as JSONSchema } from "json-schema";

export type RequestSchema = {
  body?: JSONSchema;
  headers?: JSONSchema;
  searchParams?: JSONSchema;
  params?: JSONSchema;
};

export type ResponseSchemaDefinition = {
  body?: JSONSchema;
  headers?: JSONSchema;
};

export type ResponseSchema = {
  [statusCode: number]: ResponseSchemaDefinition;
};

export type RouteMetadata = {
  [kResponseSchema]: ResponseSchema;
  [kRequestSchema]: RequestSchema;
  [key: symbol]: unknown;
};

export interface Route<S> {
  methods: HTTPMethod[];
  params: { [key: string]: string | undefined } | undefined;
  handler: Handler<S>;
  path: string;
  metadata: RouteMetadata;
}

export interface RouteConfig<S> extends Omit<Route<S>, "params"> {
  app: App<S>;
}

export type RouteMetaDescriptor<S = unknown> = [symbol: symbol, value: unknown] | ((config: RouteConfig<S>) => void);

export interface RouteOptions {
  method: HTTPMethod | HTTPMethod[];
  path: string;
}

export interface RouteFindResult<T> extends FindResult<any> {
  store: RouteConfig<T>;
}
