import type { Context } from "../../interfaces/index.js";
import type { PluginOptions } from "../../plugin.js";

export type InterceptorFilter = (ctx: Context) => boolean | Promise<boolean>;
/**
 * Options for registering interceptors with filtering capabilities.
 */
export interface InterceptorRegisterOptions extends PluginOptions {
  /**
   * Optional filter function to conditionally apply the interceptor based on the request.
   */
  filter?: InterceptorFilter;
}
