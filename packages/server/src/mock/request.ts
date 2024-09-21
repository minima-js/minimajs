import { IncomingMessage } from "http";
import { randomInt } from "crypto";
import { FastifyRequest } from "../internal/fastify.js";
import qs from "querystring";
import { logger } from "../logger.js";

const fakeDomain = "http://localhost";

export interface MockIncomingMessageOptions {
  method: string;
  url: string;
  headers: { [key: string]: string | string[] };
  httpVersion: string;
}

function createMockIncomingMessage({ headers, ...options }: MockIncomingMessageOptions): IncomingMessage {
  const req = new IncomingMessage({} as any);
  req.method = options.method;
  req.url = options.url;
  req.httpVersion = options.httpVersion;
  for (const [key, val] of Object.entries(headers!)) {
    if (Array.isArray(val)) {
      req.headers[key] = val.join(" ");
      req.headersDistinct[key] = val;
      req.rawHeaders.push(key);
      val.forEach((header) => {
        req.rawHeaders.push(header);
      });
    } else {
      req.headers[key] = val;
      req.headersDistinct[key] = [val];
      req.rawHeaders.push(key);
      req.rawHeaders.push(val);
    }
  }
  return req;
}

export interface MockRequestOptions extends Partial<MockIncomingMessageOptions> {
  params?: Record<string, string>;
  body?: unknown;
  server?: unknown;
}

export function createRequest({
  params = {},
  method = "GET",
  url = "/test",
  body,
  headers = {},
  server,
}: MockRequestOptions = {}): FastifyRequest {
  const fakeURL = new URL(url, fakeDomain);
  headers["host"] = fakeURL.host;
  headers["hostname"] = fakeURL.hostname;
  headers["x-forwarded-proto"] = fakeURL.protocol;
  const req = createMockIncomingMessage({
    url,
    method,
    httpVersion: "1.1",
    headers,
  });
  const id = `req-${randomInt(3)}`;
  const query = qs.parse(fakeURL.search.substring(1));
  const request = new FastifyRequest(id, params, req, query, logger, {
    server,
  } as unknown);
  Object.assign(request, { body });
  return request;
}
