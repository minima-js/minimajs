import type { IncomingHttpHeaders } from "node:http";
import type { StatusCodes } from "http-status-codes";

export * from "./interfaces/index.js";

type OmitIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

export type HttpHeader = string;
export type HttpCodes = number;
export type HttpHeaderIncoming = keyof OmitIndexSignature<IncomingHttpHeaders> | (string & Record<never, never>);
export type HeadersInit = Record<string, string> | Headers | [string, string][];

export interface ResponseOptions {
  status?: keyof typeof StatusCodes | number;
  headers?: HeadersInit;
}

export type Dict<T = unknown> = NodeJS.Dict<T>;
export type Next = (error?: unknown, response?: unknown) => void;
export type Signals = NodeJS.Signals;
export type GenericCallback = (...args: any[]) => any;
