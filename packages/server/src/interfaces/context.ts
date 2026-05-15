import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server as HttpServer } from "node:http";
import type { Server as HttpsServer } from "node:https";
import type { App, Container } from "./app.js";
import type { ResponseState } from "./response.js";
import type { Route } from "./route.js";
import type { ServerAdapter } from "../index.js";
import type { kIpAddr, kHost, kProto, kUrl } from "../symbols.js";

/** @internal */
export interface ContextMetadata {
  pathStart: number;
  pathEnd: number;
}

export interface ContextLocals {
  [kIpAddr]?: string | null;
  [kHost]?: string;
  [kProto]?: string;
  [kUrl]?: URL;
  [key: symbol]: unknown;
}

export interface Context<S = unknown> {
  readonly $metadata: ContextMetadata;
  readonly requestId: string;
  readonly app: App<S>;
  readonly server: S;
  readonly serverAdapter: ServerAdapter<S>;
  readonly pathname: string;
  readonly request: Request; // WebApi Request
  readonly responseState: ResponseState; // Mutable response headers/status
  readonly container: Container<S>; // app.container
  readonly locals: ContextLocals;
  readonly route: Route<S> | null;
  readonly incomingMessage: S extends HttpServer | HttpsServer ? IncomingMessage : undefined;
  readonly serverResponse: S extends HttpServer | HttpsServer ? ServerResponse : undefined;
}

export type RequestHandlerContext<S = unknown> = Partial<Pick<Context<S>, "locals" | "incomingMessage" | "serverResponse">>;
