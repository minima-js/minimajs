import type { Server } from "node:http";
import type { CreateBaseSeverOptions } from "../interfaces/server.js";
import { createBaseServer } from "../server.js";
import { NodeServerAdapter, type NodeServerOptions } from "./server.js";

export interface NodeAppOptions extends CreateBaseSeverOptions {
  server?: NodeServerOptions;
}

export function createApp({ server, ...options }: NodeAppOptions = {}) {
  return createBaseServer<Server>(new NodeServerAdapter(server), options);
}
