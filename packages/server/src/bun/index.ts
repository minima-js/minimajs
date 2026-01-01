import type { CreateBaseSeverOptions } from "../interfaces/server.js";
import { BunServerAdapter, type BunServeOptions } from "./server.js";
import { createBaseServer } from "../server.js";

export interface BunAppOptions extends CreateBaseSeverOptions {
  server?: BunServeOptions;
}

export function createApp({ server, ...options }: BunAppOptions = {}) {
  return createBaseServer(new BunServerAdapter(server), options);
}
