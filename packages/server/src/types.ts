import type { IncomingHttpHeaders, Server } from "node:http";
import type {
  FastifyBaseLogger,
  FastifyHttpOptions,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";

import type { kPluginNameChain } from "./internal/fastify.js";
import type { OmitIndexSignature } from "fastify/types/utils.js";

export type { FastifyRegister } from "fastify";
export type { HttpHeader, HTTPMethods, HttpCodes } from "fastify/types/utils.js";
export type HttpHeaderIncoming = keyof OmitIndexSignature<IncomingHttpHeaders> | (string & Record<never, never>);

export interface PluginOptions extends FastifyPluginOptions {
  name?: string;
}

/**
 * The App interface in Minima.js represents a customized server instance equipped for handling requests.
 */
export interface App extends FastifyInstance {
  [kPluginNameChain]?: string[];
}
export interface Request extends FastifyRequest {}
export interface Response extends FastifyReply {}

export type Plugin<Opts extends FastifyPluginOptions = Record<never, never>> = FastifyPluginAsync<Opts>;
/**
 * Fastify plugin callback type used for hook plugins.
 */
export type PluginSync<Opts extends FastifyPluginOptions = Record<never, never>> = FastifyPluginCallback<Opts>;
export interface AppOptions extends FastifyHttpOptions<Server, FastifyBaseLogger> {}

export type Dict<T = unknown> = NodeJS.Dict<T>;
export type Next = (error?: unknown, response?: unknown) => void;
export type Signals = NodeJS.Signals;
export type GenericCallback = (...args: any[]) => any;
