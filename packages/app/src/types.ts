import type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { kPluginNameChain } from "./fastify/symbol.js";

export type { FastifyRegister } from "fastify";
export interface PluginOptions extends FastifyPluginOptions {
  name?: string;
}
export interface App extends FastifyInstance {
  [kPluginNameChain]?: string[];
}
export interface Request extends FastifyRequest {}
export interface Response extends FastifyReply {}
export interface Plugin<Options extends PluginOptions = Record<never, never>>
  extends FastifyPluginAsync<Options> {}

export type Dict<T> = NodeJS.Dict<T>;
