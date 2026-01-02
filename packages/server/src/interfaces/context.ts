import type { IncomingMessage, ServerResponse } from "node:http";
import type { Server as NodeServer } from "node:http";
import type { App, Container } from "./app.js";
import type { ResponseState } from "./response.js";
import type { Route } from "./route.js";

export interface Context<S = unknown> {
  readonly app: App<S>;
  readonly server: S;
  readonly url: URL;
  readonly request: Request; // WebApi Request
  readonly responseState: ResponseState; // Mutable response headers/status
  readonly container: Container; // app.container
  readonly locals: Map<symbol, unknown>;
  readonly signal: AbortSignal;
  readonly route: Route<S> | null;
  readonly incomingMessage: S extends NodeServer ? IncomingMessage : undefined;
  readonly serverResponse: S extends NodeServer ? ServerResponse : undefined;
}
