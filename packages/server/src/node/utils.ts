import type { IncomingMessage, ServerResponse } from "node:http";

export function toWebHeaders(nodeHeaders: IncomingMessage["headers"]): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        headers.append(key, v);
      }
    } else {
      headers.set(key, value);
    }
  }
  return headers;
}

export function toWebRequest(req: IncomingMessage, domain: string = "http://localhost"): Request {
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

  const request = new Request(url, {
    method: req.method,
    headers: toWebHeaders(req.headers),
    body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
    signal: controller.signal,
  });
  return request;
}

export async function fromWebResponse(webResponse: Response, nodeResponse: ServerResponse): Promise<void> {
  nodeResponse.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    nodeResponse.setHeader(key, value);
  });

  const body = await webResponse.text();
  nodeResponse.end(body);
}
