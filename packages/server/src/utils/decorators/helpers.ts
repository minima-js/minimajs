import type { Context } from "../../context.js";
import type { PluginOptions } from "../../interfaces/plugin.js";

export type InterceptorFilter = (req: Context) => boolean | Promise<boolean>;
/**
 * Options for registering interceptors with filtering capabilities.
 */
export interface InterceptorRegisterOptions extends PluginOptions {
  /**
   * Optional filter function to conditionally apply the interceptor based on the request.
   */
  filter?: InterceptorFilter;
}
