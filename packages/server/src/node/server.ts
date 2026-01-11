import {
  type Server as NodeServer,
  type IncomingMessage,
  type ServerResponse,
  createServer,
  type ServerOptions,
} from "node:http";
import { toWebRequest, fromWebResponse } from "./utils.js";
import type { AddressInfo, ServerAdapter, ListenOptions, RequestHandler, ListenResult } from "../interfaces/server.js";
import type { Server } from "../core/index.js";

export type NodeServerOptions = ServerOptions<typeof IncomingMessage, typeof ServerResponse>;

export class NodeServerAdapter implements ServerAdapter<NodeServer> {
  constructor(private readonly serverOptions?: NodeServerOptions) {}

  getAddress(server: NodeServer): AddressInfo {
    const info = server.address();
    if (!info) {
      throw new Error("Server is not listening");
    }

    // server.address() returns a string for pipes/Unix sockets
    if (typeof info === "string") {
      return {
        hostname: info,
        port: 0,
        family: "unix",
        protocol: "http",
        address: info,
      };
    }

    // Use the actual address from server.address(), fallback to provided host
    const hostname = info.address;
    return {
      hostname,
      port: info.port,
      family: info.family as AddressInfo["family"],
      protocol: "http",
      address: `http://${hostname}:${info.port}/`,
    };
  }

  async listen(
    srv: Server,
    opts: ListenOptions,
    requestHandler: RequestHandler<NodeServer>
  ): Promise<ListenResult<NodeServer>> {
    async function onRequest(req: IncomingMessage, res: ServerResponse) {
      const request = toWebRequest(req);
      const response = await requestHandler(srv, request, {
        incomingMessage: req,
        serverResponse: res,
      });
      await fromWebResponse(response, res);
    }

    const hostname = opts.host || "0.0.0.0";
    const port = opts.port;
    const server = this.serverOptions ? createServer(this.serverOptions, onRequest) : createServer(onRequest);

    await new Promise<void>((resolve) => {
      server.listen(port, hostname, () => {
        resolve();
      });
    });

    const address = this.getAddress(server);
    return { server, address };
  }

  async close(server: NodeServer): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
