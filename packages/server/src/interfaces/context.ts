import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";
import type { App, Container } from "./app.js";
import type { ResponseState } from "./response.js";
import type { Route } from "./route.js";

export interface ContextMetadata {
  url?: URL;
  searchParams?: URLSearchParams;
  pathStart: number;
  pathEnd: number;
}

export interface Context<S = unknown> {
  readonly app: App<S>;
  readonly server: S;
  readonly pathname: string;
  readonly $metadata: ContextMetadata;
  readonly request: Request; // WebApi Request
  readonly responseState: ResponseState; // Mutable response headers/status
  readonly container: Container; // app.container
  readonly locals: Record<symbol, unknown>;
  readonly route: Route<S> | null;
  readonly incomingMessage: S extends HttpServer | HttpsServer ? IncomingMessage : undefined;
  readonly serverResponse: S extends HttpServer | HttpsServer ? ServerResponse : undefined;
}

export type RequestHandlerContext<S = unknown> = Partial<Pick<Context<S>, "incomingMessage" | "serverResponse">>;
