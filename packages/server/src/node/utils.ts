import type { IncomingMessage, ServerResponse } from "node:http";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

export function toWebHeaders(nodeHeaders: IncomingMessage["headers"]): Headers {
  const headers = new Headers();
  for (const key in nodeHeaders) {
    const value = nodeHeaders[key];
    if (value === undefined) continue;
    if (typeof value === "string") {
      headers.set(key, value);
      continue;
    }
    for (let i = 0; i < value.length; i++) {
      headers.append(key, value[i]!);
    }
  }
  return headers;
}

export interface ToWebRequestOptions {
  domain?: string;
  signal?: AbortSignal;
}

export function toWebRequest(req: IncomingMessage, options: ToWebRequestOptions = {}): Request {
  const { signal } = options;
  let { domain = "http://localhost" } = options;
  const { headers } = req;
  if (headers.host) {
    domain = `http://${headers.host}`;
  }
  const url = domain + req.url;
  // Create AbortController to handle request abortion
  const controller = new AbortController();
  // Listen for client disconnect
  req.on("close", () => {
    if (!req.complete) {
      controller.abort();
    }
  });

  // Combine request signal with any external signal (e.g. response-close)
  // so that request.signal() fires on client disconnect at any point in the lifecycle
  const combined = signal ? AbortSignal.any([controller.signal, signal]) : controller.signal;

  const request = new Request(url, {
    method: req.method,
    headers: toWebHeaders(req.headers),
    body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
    signal: combined,
    duplex: "half",
  });

  return request;
}

export interface FromWebResponseOptions {
  signal?: AbortSignal;
}

export async function fromWebResponse(
  webResponse: Response,
  nodeResponse: ServerResponse,
  options: FromWebResponseOptions = {}
): Promise<void> {
  nodeResponse.statusCode = webResponse.status;
  nodeResponse.setHeaders(webResponse.headers);
  if (!webResponse.body) {
    nodeResponse.end();
    return;
  }

  try {
    await pipeline(Readable.fromWeb(webResponse.body), nodeResponse, { signal: options.signal });
  } catch (err) {
    // Client disconnected mid-stream — nothing to do, response is already gone
    if (options.signal?.aborted) return;
    if (!nodeResponse.headersSent) {
      nodeResponse.statusCode = 500;
    }
    nodeResponse.destroy(err as Error);
  }
}
