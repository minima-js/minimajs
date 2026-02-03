import type { Context, RequestHandlerContext } from "./index.js";
import type { Server } from "../core/server.js";

export interface RemoteAddr {
  hostname: string;
  port: number;
  family: "IPv4" | "IPv6";
  transport?: "tcp" | "udp";
}

/**
 * Information about the server's network address and binding.
 */
export interface AddressInfo {
  /** The hostname the server is bound to */
  hostname: string;
  /** The port number the server is listening on */
  port: number;
  /** The IP address family */
  family: "IPv4" | "IPv6" | "unix";
  /** The protocol being used */
  protocol: "http" | "https";
  /** The full address string */
  href: string;
  readonly [Symbol.toStringTag]: string;
  toString(): string;
}

/**
 * Options for starting a server listener.
 */
export interface ListenOptions {
  /** Port number to bind to */
  port: number;
  /** Hostname to bind to (default: "0.0.0.0") */
  host?: string;
}

/**
 * Handler function that processes HTTP requests.
 * Takes a Web standard Request and returns a Web standard Response.
 */
export type RequestHandler<S> = (
  server: Server<S>,
  request: Request,
  partial: RequestHandlerContext<S>
) => Promise<Response>;

/**
 * Result returned when a server starts listening.
 * Contains the native server instance and address information.
 */
export interface ListenResult<T> {
  /** The native server instance (e.g., Bun server, Node server) */
  server: T;
  /** Network address and binding information */
  address: AddressInfo;
}

/**
 * Adapter interface for different server implementations.
 * Abstracts the underlying server runtime (Bun, Node, Deno, etc).
 *
 * @template T - The native server type (e.g., BunServer, http.Server)
 *
 * @example
 * ```typescript
 * // Bun server adapter
 * const bunAdapter: ServerAdapter<BunServer> = {
 *   async listen(opts, handler) {
 *     const server = Bun.serve({
 *       port: opts.port,
 *       hostname: opts.host,
 *       fetch: handler
 *     });
 *     return { server, address: {...} };
 *   },
 *   async close(server) {
 *     server.stop();
 *   }
 * };
 * ```
 */
export interface ServerAdapter<T> {
  /**
   * Starts the server and begins listening for requests.
   *
   * @param opts - Listening options (port, host)
   * @param requestHandler - Function to handle incoming requests
   * @returns Promise resolving to server instance and address info
   */
  listen(server: Server<T>, opts: ListenOptions, requestHandler: RequestHandler<T>): Promise<ListenResult<T>>;

  remoteAddr(ctx: Context<T>): RemoteAddr | null;

  /**
   * Stops the server and closes all connections.
   *
   * @param server - The native server instance to close
   * @returns Promise that resolves when server is closed
   */
  close(server: T): Promise<void>;
}
