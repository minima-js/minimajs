import type { GeneratorType } from "./generators.js";
import moduleStub from "./templates/module.stub";
import handlerStub from "./templates/handler.stub";
import serviceStub from "./templates/service.stub";
import middlewareStub from "./templates/middleware.stub";
import pluginStub from "./templates/plugin.stub";
import hookStub from "./templates/hook.stub";
import jobStub from "./templates/job.stub";
import cronStub from "./templates/cron.stub";
import eventStub from "./templates/event.stub";

export const stubs: Record<GeneratorType | "module" | "handler", (vars: Record<string, string>) => string> = {
  module: moduleStub,
  handler: handlerStub,
  service: serviceStub,
  middleware: middlewareStub,
  plugin: pluginStub,
  hook: hookStub,
  job: jobStub,
  cron: cronStub,
  event: eventStub,
};
