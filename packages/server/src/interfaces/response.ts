import type { StatusCodes } from "http-status-codes";
import type { IncomingHttpHeaders } from "node:http";
import type { Context } from "../interfaces/index.js";

export type ResponseBody = string | ReadableStream | ArrayBuffer | Blob | null;
export type Serializer = (body: unknown, ctx: Context) => ResponseBody | Promise<ResponseBody>;
export type ErrorHandler = (error: unknown, ctx: Context) => Response | Promise<Response>;

export type HeadersInit = Record<string, string> | Headers | [string, string][];

export interface ResponseState {
  status?: number;
  statusText?: string;
  headers: Headers;
}

export interface ResponseOptions {
  status?: keyof typeof StatusCodes | number;
  headers?: HeadersInit;
}

// ============================================================================
// HTTP Types
// ============================================================================

type OmitIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

export type HttpHeader = string;
export type HttpCodes = number;
export type HttpHeaderIncoming = keyof OmitIndexSignature<IncomingHttpHeaders> | (string & Record<never, never>);

// ============================================================================
// Utility Types
// ============================================================================

export type Dict<T = unknown> = NodeJS.Dict<T>;
export type Next = (error?: unknown, response?: unknown) => void;
export type GenericCallback = (...args: any[]) => any;
