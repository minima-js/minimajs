import { type Server as BunServer, type Serve } from "bun";
import type { AddressInfo, ServerAdapter, ListenOptions, RequestHandler, ListenResult } from "../interfaces/server.js";
import type { Context, Server } from "../index.js";

export type BunServeOptions<T = unknown> = Omit<Serve.Options<T>, "fetch" | "port" | "hostname">;

export class BunServerAdapter<T = unknown> implements ServerAdapter<BunServer<T>> {
  constructor(private readonly serverOptions: BunServeOptions<T> = {}) {}

  remoteAddr(ctx: Context<BunServer<T>>): string | null {
    return ctx.server.requestIP(ctx.request)?.address || null;
  }

  async listen(
    srv: Server,
    opts: ListenOptions,
    requestHandler: RequestHandler<BunServer<T>>
  ): Promise<ListenResult<BunServer<T>>> {
    const host = opts.host || "0.0.0.0";
    const port = opts.port;
    // TODO: Need to figure correct option types!
    const server = Bun.serve<T>({
      ...(this.serverOptions as any),
      port,
      hostname: host,
      development: this.serverOptions.development ?? process.env.NODE_ENV !== "production",
      fetch: (request) => requestHandler(srv, request, {}),
    });

    const address: AddressInfo = {
      hostname: server.hostname!,
      port: server.port!,
      family: (server as any).address?.family, // TODO: fix typing
      protocol: server.protocol!,
      address: server.url.href,
    };

    return { server, address };
  }

  async close(server: BunServer<T>): Promise<void> {
    await server.stop();
  }
}
