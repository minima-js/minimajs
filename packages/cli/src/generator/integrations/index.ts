import type { CommandDef } from "citty";
import { openapi } from "./openapi.js";
import { disk } from "./disk.js";
import { dockerfile } from "./docker-file.js";
import { module } from "./module.js";
import { skill } from "./skill.js";
import { middleware } from "./middleware.js";
import { plugin } from "./plugin.js";
import { hook } from "./hook.js";
import { service } from "./service.js";
import { lint } from "./lint.js";
import { format } from "./format.js";

export const integrations: Record<string, CommandDef<any>> = {
  openapi,
  disk,
  dockerfile,
  module,
  skill,
  middleware,
  plugin,
  hook,
  service,
  lint,
  format,
};
