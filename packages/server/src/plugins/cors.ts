import { plugin } from "../internal/plugins.js";
import { context } from "../internal/context.js";
import { createResponseFromState } from "../internal/response.js";

export interface CorsOptions {
  /** Configures the Access-Control-Allow-Origin header. Default: '*' */
  origin?: string | string[] | ((origin: string) => boolean | Promise<boolean>);
  /** Configures the Access-Control-Allow-Methods header. Default: 'GET,HEAD,PUT,PATCH,POST,DELETE' */
  methods?: string | string[];
  /** Configures the Access-Control-Allow-Headers header */
  allowedHeaders?: string | string[];
  /** Configures the Access-Control-Expose-Headers header */
  exposedHeaders?: string | string[];
  /** Configures the Access-Control-Allow-Credentials header */
  credentials?: boolean;
  /** Configures the Access-Control-Max-Age header (in seconds) */
  maxAge?: number;
  /** Provides a status code to use for successful OPTIONS requests. Default: 204 */
  optionsSuccessStatus?: number;
  /** Pass the CORS preflight response to the next handler. Default: false */
  preflightContinue?: boolean;
}

const defaultOptions: Required<Omit<CorsOptions, "origin">> & { origin: string } = {
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "*",
  exposedHeaders: "",
  credentials: false,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 204,
  preflightContinue: false,
};

/**
 * Builds CORS headers based on configuration
 */
function buildCorsHeaders(
  allowOrigin: string,
  config: Required<Omit<CorsOptions, "origin">> & {
    origin: string | string[] | ((origin: string) => boolean | Promise<boolean>);
  },
  isPreflight: boolean
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
  };

  if (config.credentials) {
    headers["Access-Control-Allow-Credentials"] = "true";
  }

  if (isPreflight) {
    // Preflight-specific headers
    const methods = Array.isArray(config.methods) ? config.methods.join(",") : config.methods;
    headers["Access-Control-Allow-Methods"] = methods;

    if (config.allowedHeaders) {
      const allowedHeaders = Array.isArray(config.allowedHeaders)
        ? config.allowedHeaders.join(",")
        : config.allowedHeaders;
      headers["Access-Control-Allow-Headers"] = allowedHeaders;
    }

    if (config.maxAge) {
      headers["Access-Control-Max-Age"] = config.maxAge.toString();
    }
  } else {
    // Regular response headers
    if (config.exposedHeaders) {
      const exposedHeaders = Array.isArray(config.exposedHeaders)
        ? config.exposedHeaders.join(",")
        : config.exposedHeaders;
      if (exposedHeaders) {
        headers["Access-Control-Expose-Headers"] = exposedHeaders;
      }
    }
  }

  return headers;
}

/**
 * Resolves the origin value based on configuration
 */
async function resolveOrigin(
  configOrigin: string | string[] | ((origin: string) => boolean | Promise<boolean>),
  requestOrigin: string
): Promise<string | false> {
  // String: exact match or wildcard
  if (typeof configOrigin === "string") {
    if (configOrigin === "*") {
      return "*";
    }
    return configOrigin === requestOrigin ? requestOrigin : false;
  }

  // Array: check if origin is in the list
  if (Array.isArray(configOrigin)) {
    return configOrigin.includes(requestOrigin) ? requestOrigin : false;
  }

  // Function: dynamic validation
  if (typeof configOrigin === "function") {
    const result = await configOrigin(requestOrigin);
    return result ? requestOrigin : false;
  }

  return false;
}

/**
 * Creates a CORS plugin that handles Cross-Origin Resource Sharing.
 * Uses the send hook to set CORS headers on responses.
 *
 * @param options - Configuration options for CORS
 *
 * @returns A plugin that adds CORS support to the app
 *
 * @example
 * ```typescript
 * import { cors } from '@minimajs/server/plugins';
 *
 * // Allow all origins
 * app.register(cors());
 *
 * // Custom configuration
 * app.register(cors({
 *   origin: 'https://example.com',
 *   credentials: true,
 *   methods: ['GET', 'POST'],
 * }));
 *
 * // Dynamic origin validation
 * app.register(cors({
 *   origin: (origin) => {
 *     return origin.endsWith('.example.com');
 *   }
 * }));
 * ```
 */
export function cors(options: CorsOptions = {}) {
  const config = { ...defaultOptions, ...options };

  return plugin((app) => {
    // Handle preflight OPTIONS requests
    app.on("request", async (req): Promise<Response | void> => {
      if (req.method !== "OPTIONS") {
        return;
      }

      const origin = req.headers.get("origin") || "";
      const allowOrigin = await resolveOrigin(config.origin, origin);

      if (!allowOrigin) {
        return; // Origin not allowed, let it continue to return 404 or custom handler
      }

      // Build preflight CORS headers
      const headers = buildCorsHeaders(allowOrigin, config, true);

      // If preflightContinue is false, return early with OPTIONS response
      if (!config.preflightContinue) {
        return createResponseFromState(null, {
          status: config.optionsSuccessStatus,
          headers,
        });
      }
    });

    // Add CORS headers to all responses
    app.on("send", async (_body, req) => {
      const origin = req.headers.get("origin") || "";
      const allowOrigin = await resolveOrigin(config.origin, origin);

      if (!allowOrigin) {
        return; // Origin not allowed, don't add CORS headers
      }

      const headers = buildCorsHeaders(allowOrigin, config, false);

      // Write CORS headers to context response
      const { resInit: response } = context();
      for (const [key, value] of Object.entries(headers)) {
        response.headers.set(key, value);
      }
    });
  });
}
