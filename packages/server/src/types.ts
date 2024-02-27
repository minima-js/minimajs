import type {
  FastifyBaseLogger,
  FastifyHttpOptions,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { kErrorRenderer, kPluginNameChain } from "./internal/symbol.js";
import type { Server } from "node:http";
import type { Renderer } from "./error.js";

export type { FastifyRegister } from "fastify";
export interface PluginOptions extends FastifyPluginOptions {
  name?: string;
}
export interface App extends FastifyInstance {
  [kPluginNameChain]?: string[];
  [kErrorRenderer]?: Renderer;
}
export interface Request extends FastifyRequest {}
export interface Response extends FastifyReply {}
export interface Plugin<Options extends PluginOptions = Record<never, never>>
  extends FastifyPluginAsync<Options> {}

export interface AppOptions
  extends FastifyHttpOptions<Server, FastifyBaseLogger> {
  routes?: {
    log: boolean;
  };
}
export type Dict<T> = NodeJS.Dict<T>;
