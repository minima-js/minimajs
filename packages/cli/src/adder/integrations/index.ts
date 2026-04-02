import { openapi } from "./openapi.js";
import { disk } from "./disk.js";
import { cache } from "./cache.js";
import { queue } from "./queue.js";
import { mail } from "./mail.js";
import type { Integration } from "./types.js";

export type { Integration } from "./types.js";
export { addIntegration } from "./run.js";

export const integrations: Record<string, Integration | undefined> = {
  openapi,
  disk,
  cache,
  queue,
  mail,
};
