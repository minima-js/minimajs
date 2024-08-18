import { ServerResponse } from "node:http";
import { fn } from "jest-mock";
import { type Request } from "../types.js";
import { FastifyReply } from "../internal/fastify.js";
import { logger } from "../logger.js";

export interface MockResponseOptions {
  request: Request;
}
export function createResponse({ request }: MockResponseOptions) {
  const res = new ServerResponse(request.raw);
  res.end = fn() as any;
  return new FastifyReply(res, request, logger);
}
