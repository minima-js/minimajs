import symbols from "fastify/lib/symbols.js";
export const kPluginNameChain: unique symbol = symbols.kPluginNameChain;
export const kRequestContext: unique symbol = symbols.kRouteContext;
export const kErrorRenderer = Symbol("ErrorHandler");
