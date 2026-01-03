import {
  type Server as NodeServer,
  type IncomingMessage,
  type ServerResponse,
  createServer,
  type ServerOptions,
} from "node:http";
import type { AddressInfo } from "node:net";
import { toWebRequest, fromWebResponse } from "./utils.js";
import type { Address, ServerAdapter, ListenOptions, RequestHandler, ListenResult } from "../interfaces/server.js";

export type NodeServerOptions = ServerOptions<typeof IncomingMessage, typeof ServerResponse>;

export class NodeServerAdapter implements ServerAdapter<NodeServer> {
  constructor(private readonly serverOptions?: NodeServerOptions) {}

  async listen(opts: ListenOptions, requestHandler: RequestHandler): Promise<ListenResult<NodeServer>> {
    async function onRequest(req: IncomingMessage, res: ServerResponse) {
      const request = toWebRequest(req);
      const response = await requestHandler(request);
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

    const addr = server.address() as AddressInfo;

    const address: Address = {
      hostname,
      port: addr.port,
      family: addr.family,
      protocol: "http",
      address: `http://${hostname}:${addr.port}`,
    };

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
