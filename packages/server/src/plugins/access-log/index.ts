import { hook } from "../../hooks/index.js";

const kStartTime = Symbol("minimajs.access-log.start");
export interface AccessLogOptions {
  /** Log level to use for access log entries. Defaults to "info" */
  level?: "trace" | "debug" | "info";
}

/**
 * Logs each request with method, path, status code, and duration.
 *
 * @example
 * ```typescript
 * import { accessLog } from "@minimajs/server/plugins";
 * app.register(accessLog());
 * ```
 */
export function accessLog({ level = "info" }: AccessLogOptions = {}) {
  return hook.factory((hooks) => {
    hooks.request.add((ctx) => {
      ctx.locals[kStartTime] = performance.now();
    });

    hooks.send.add((response, ctx) => {
      const duration = Math.round(performance.now() - (ctx.locals[kStartTime] as number));
      ctx.app.logger[level]({ status: response.status, duration }, `${ctx.request.method} ${ctx.pathname}`);
    });
  });
}
