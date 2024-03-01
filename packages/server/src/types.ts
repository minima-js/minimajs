import type {
  FastifyBaseLogger,
  FastifyHttpOptions,
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import {
  kResponseDecorator,
  kErrorDecorator,
  kPluginNameChain,
} from "./internal/symbol.js";
import type { Server } from "node:http";
import type { Decorator as ErrorDecorator } from "./error.js";
import type { Decorator as ResponseDecorator } from "./response.js";

export type { FastifyRegister } from "fastify";
export interface PluginOptions extends FastifyPluginOptions {
  name?: string;
}
export interface App extends FastifyInstance {
  [kPluginNameChain]?: string[];
  [kErrorDecorator]?: ErrorDecorator;
  [kResponseDecorator]?: ResponseDecorator;
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
