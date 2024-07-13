import type { IncomingHttpHeaders, Server } from "node:http";
import type {
  FastifyBaseLogger,
  FastifyHttpOptions,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { kPluginNameChain } from "./internal/symbol.js";
import type { OmitIndexSignature } from "fastify/types/utils.js";

export type { FastifyRegister } from "fastify";
export type { HttpHeader, HTTPMethods, HttpCodes } from "fastify/types/utils.js";
export type HttpHeaderIncoming = keyof OmitIndexSignature<IncomingHttpHeaders> | (string & Record<never, never>);

export interface PluginOptions extends FastifyPluginOptions {
  name?: string;
}

/**
 * The App interface in Minimajs represents a customized server instance equipped for handling requests.
 */
export interface App extends FastifyInstance {
  [kPluginNameChain]?: string[];
}
export interface Request extends FastifyRequest {}
export interface Response extends FastifyReply {}
export interface Plugin<Options extends PluginOptions = Record<never, never>> extends FastifyPluginAsync<Options> {}

export interface AppOptions extends FastifyHttpOptions<Server, FastifyBaseLogger> {
  killSignal?: NodeJS.Signals[];
  routes?: {
    log: boolean;
  };
}
export type Dict<T = unknown> = NodeJS.Dict<T>;
export type Next = (error?: unknown, response?: unknown) => void;
