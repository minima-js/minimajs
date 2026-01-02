import type { CreateBaseSeverOptions } from "../interfaces/server.js";
import { BunServerAdapter, type BunServeOptions } from "./server.js";
import { createBaseServer } from "../server.js";

export interface BunAppOptions<T> extends CreateBaseSeverOptions {
  server?: BunServeOptions<T>;
}

export function createApp<T = unknown>({ server, ...options }: BunAppOptions<T> = {}) {
  return createBaseServer(new BunServerAdapter<T>(server), options);
}
