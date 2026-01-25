import { hook } from "../../hooks/index.js";
import type { Context, RouteMetaDescriptor } from "../../interfaces/index.js";
import { kBody, kBodySkip } from "../../symbols.js";

export type BodyParserType = "json" | "text" | "form" | "arrayBuffer" | "blob";

/**
 * Options for body parser plugin
 */
export interface BodyParserOptions {
  enabled?: boolean;
  /**
   * Clone the request before parsing (useful if you need to read the body multiple times)
   * @default false
   */
  clone?: boolean;
  /**
   * Content types to parse (array for multiple types, or single type)
   * - "json": Parse as JSON (application/json)
   * - "text": Parse as text (text/*)
   * - "form": Parse as form data (application/x-www-form-urlencoded, multipart/form-data) - **DEPRECATED**: Use @minimajs/multipart instead
   * - "arrayBuffer": Parse as ArrayBuffer
   * - "blob": Parse as Blob
   * @default ["json"]
   */
  type?: BodyParserType | BodyParserType[];
}

/**
 * Body parser plugin that automatically parses request bodies
 * and stores them in context.locals for access via body() function
 *
 * **Note:** Body parser is enabled by default.
 * You can override the configuration or disable it by re-registering with different options.
 *
 * @example
 * ```ts
 * import { createApp } from '@minimajs/server/bun';
 * import { bodyParser } from '@minimajs/server/plugins';
 * import { body } from '@minimajs/server';
 *
 * const app = createApp();
 * // Body parser is already enabled - use body() directly
 * app.post('/users', () => {
 *   const data = body<{ name: string }>();
 *   return { received: data };
 * });
 *
 * // Override configuration to parse text instead of JSON
 * app.register(bodyParser({ type: "text" }));
 *
 * // Or disable it entirely
 * app.register(bodyParser({ enabled: false }));
 * ```
 */

/**
 * Detect parse type based on content-type header and allowed types
 */
function detectParseType(contentType: string | null, allowedTypes: Set<BodyParserType>): BodyParserType | null {
  if (!contentType) {
    return null;
  }

  // Check each allowed type and see if content-type matches
  if (allowedTypes.has("json") && contentType.includes("application/json")) {
    return "json";
  }

  if (allowedTypes.has("text") && contentType.startsWith("text/")) {
    return "text";
  }

  if (
    allowedTypes.has("form") &&
    (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data"))
  ) {
    return "form";
  }

  // For arrayBuffer and blob, check if they're in allowed types
  // These don't have specific content-types, so we parse them if allowed
  if (allowedTypes.has("arrayBuffer")) {
    return "arrayBuffer";
  }

  if (allowedTypes.has("blob")) {
    return "blob";
  }

  return null;
}

function getAllowedTypes(type?: BodyParserType | BodyParserType[]): Set<BodyParserType> {
  if (!type) return new Set();
  if (!Array.isArray(type)) type = [type];
  return new Set(type);
}
const kBodyParser = Symbol("minimajs.body.parser");

export function bodyParser(opts: BodyParserOptions = { type: ["json"] }) {
  if (opts.enabled === false) {
    return hook.factory((hooks, app) => {
      hooks.request.delete(app.$root.container[kBodyParser] as any);
    });
  }
  // Convert type option to Set for fast lookup
  const allowedTypes = getAllowedTypes(opts.type);

  async function onRequest({ request, app, route, locals }: Context) {
    if (route?.metadata[kBodySkip]) return;
    // Mark that body parser is registered, even if no body is parsed
    locals[kBody] = null;

    const contentType = request.headers.get("content-type");

    // Detect which type to parse based on content-type and allowed types
    const parseType = detectParseType(contentType, allowedTypes);

    if (!parseType) {
      return; // No content-type or unsupported type
    }

    try {
      let req = request;
      if (opts.clone) {
        req = request.clone() as Request;
      }

      let parsed: unknown;
      switch (parseType) {
        case "json":
          parsed = await req.json();
          break;
        case "text":
          parsed = await req.text();
          break;
        case "form":
          parsed = await req.formData();
          break;
        case "arrayBuffer":
          parsed = await req.arrayBuffer();
          break;
        case "blob":
          parsed = await req.blob();
          break;
      }

      locals[kBody] = parsed;
    } catch {
      // Parse error - keep null value
      app.log.error("body already parsed!");
      // The body() function will return null
    }
  }
  return hook.factory((hooks, app) => {
    // Warn if form type is used (deprecated)
    if (allowedTypes.has("form")) {
      app.log.warn(
        "[bodyParser] The 'form' type is deprecated and will be removed in a future version. " +
          "Please use @minimajs/multipart for form data parsing instead."
      );
    }
    hooks.request.delete(app.$root.container[kBodyParser] as any);
    app.$root.container[kBodyParser] = onRequest;
    hooks.request.add(onRequest);
  });
}

export namespace bodyParser {
  export function skip(): RouteMetaDescriptor {
    return [kBodySkip, true];
  }
}
