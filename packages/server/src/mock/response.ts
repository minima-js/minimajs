import { ServerResponse } from "node:http";
import { jest } from "@jest/globals";
import { type Request } from "../types.js";
import { FastifyReply } from "../internal/fastify.js";
import { logger } from "../logger.js";

export interface MockResponseOptions {
  request: Request;
}
export function createResponse({ request }: MockResponseOptions) {
  const res = new ServerResponse(request.raw);
  res.end = jest.fn() as any;
  return new FastifyReply(res, request, logger);
}
