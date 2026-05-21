import {
  type Server as NodeServer,
  type IncomingMessage,
  type ServerResponse,
  createServer,
  type ServerOptions,
} from "node:http";
import { toWebRequest, fromWebResponse } from "./utils.js";
import type {
  AddressInfo,
  CloseOptions,
  ServerAdapter,
  ListenOptions,
  RequestHandler,
  ListenResult,
  RemoteAddr,
} from "../interfaces/server.js";
import type { Server } from "../core/index.js";
import type { Context } from "../index.js";

export type NodeServerOptions = ServerOptions<typeof IncomingMessage, typeof ServerResponse>;

export class NodeServerAdapter implements ServerAdapter<NodeServer> {
  constructor(private readonly serverOptions?: NodeServerOptions) {}

  private closing = false;

  remoteAddr({ incomingMessage }: Context<NodeServer>): RemoteAddr | null {
    const socket = incomingMessage.socket;
    if (!socket.remoteAddress) return null;
    return {
      hostname: socket.remoteAddress,
      family: socket.remoteFamily as RemoteAddr["family"],
      port: socket.remotePort!,
    };
  }

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
        href: info,
        toString() {
          return this.href;
        },
      };
    }

    // Use the actual address from server.address(), fallback to provided host
    const hostname = info.address;
    const family = info.family as AddressInfo["family"];
    const href = family === "IPv6" ? `http://[${hostname}]:${info.port}/` : `http://${hostname}:${info.port}/`;
    return {
      hostname,
      port: info.port,
      family: info.family as AddressInfo["family"],
      protocol: "http",
      href,
      toString() {
        return this.href;
      },
    };
  }

  async listen(
    srv: Server<NodeServer>,
    opts: ListenOptions,
    requestHandler: RequestHandler<NodeServer>
  ): Promise<ListenResult<NodeServer>> {
    this.closing = false;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    async function onRequest(req: IncomingMessage, res: ServerResponse) {
      if (self.closing) res.setHeader("Connection", "close");
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

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, hostname, () => {
        server.off("error", reject); // clean up
        resolve();
      });
    });

    const address = this.getAddress(server);
    return { server, address };
  }

  async close(server: NodeServer, options: CloseOptions = {}): Promise<void> {
    this.closing = true;
    if (options.force) {
      server.closeAllConnections();
    } else {
      server.closeIdleConnections();
    }
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}
