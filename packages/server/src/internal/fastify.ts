import symbols from "fastify/lib/symbols.js";
export { default as FastifyReply } from "fastify/lib/reply.js";
export { default as FastifyRequest } from "fastify/lib/request.js";

export const kPluginNameChain: unique symbol = symbols.kPluginNameChain;
export const kRequestContext: unique symbol = symbols.kRouteContext;
