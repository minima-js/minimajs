type IncomingMessage = import("node:http").IncomingMessage;
type ParsedUrlQuery = import("node:querystring").ParsedUrlQuery;
type FastifyRequest = import("fastify").FastifyRequest;
type FastifyReply = import("fastify").FastifyReply;
type Logger = import("pino").Logger;

declare module "fastify/lib/symbols.js" {
  const symbols: Record<string, any>;
  export = symbols;
}

declare module "fastify/lib/request.js" {
  export default {} as new (
    id: string,
    params: Record<string, string>,
    req: IncomingMessage,
    query: ParsedUrlQuery,
    logger: Logger,
    context: FastifyRequest["context"]
  ) => FastifyRequest;
}

declare module "fastify/lib/reply.js" {
  export default {} as new (res: ServerResponse, request: FastifyRequest, logger: Logger) => FastifyReply;
}
