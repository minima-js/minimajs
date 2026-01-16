import type { StatusCodes } from "http-status-codes";
import type { IncomingHttpHeaders } from "node:http";
import type { Context } from "../interfaces/index.js";

export type ResponseBody = string | ReadableStream | ArrayBuffer | Blob | FormData | URLSearchParams | null;
export type Serializer<S = unknown> = (body: unknown, ctx: Context<S>) => ResponseBody | Promise<ResponseBody>;
export type ErrorHandler<S = unknown> = (error: unknown, ctx: Context<S>) => Response | Promise<Response>;

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

/**
 * Utility type that removes index signatures from a type.
 * @internal
 */
export type OmitIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

export type HttpHeader = string;
export type HttpCodes = number;
export type HttpHeaderIncoming = keyof OmitIndexSignature<IncomingHttpHeaders> | (string & Record<never, never>);
