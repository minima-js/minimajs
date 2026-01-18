import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";
import type { App, Container } from "./app.js";
import type { ResponseState } from "./response.js";
import type { Route } from "./route.js";
import type { ServerAdapter } from "../index.js";
import type { kIpAddr } from "../symbols.js";

export interface ContextMetadata {
  url?: URL;
  host?: string;
  proto?: string;
  pathStart: number;
  pathEnd: number;
}

export interface ContextLocals {
  [kIpAddr]?: string | null;
  [key: symbol]: unknown;
}

export interface Context<S = unknown> {
  readonly app: App<S>;
  readonly server: S;
  readonly serverAdapter: ServerAdapter<S>;
  readonly pathname: string;
  readonly $metadata: ContextMetadata;
  readonly request: Request; // WebApi Request
  readonly responseState: ResponseState; // Mutable response headers/status
  readonly container: Container<S>; // app.container
  readonly locals: ContextLocals;
  readonly route: Route<S> | null;
  readonly incomingMessage: S extends HttpServer | HttpsServer ? IncomingMessage : undefined;
  readonly serverResponse: S extends HttpServer | HttpsServer ? ServerResponse : undefined;
}

export type RequestHandlerContext<S = unknown> = Partial<Pick<Context<S>, "incomingMessage" | "serverResponse">>;
