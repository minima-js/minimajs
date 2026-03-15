import { describe, test, expect, afterEach } from "@jest/globals";
import { createApp } from "./index.js";
import { NodeServerAdapter } from "./server.js";
import type { Server } from "../core/index.js";
import { createRequest } from "../mock/request.js";
import { IncomingMessage, ServerResponse, type Server as NodeServer } from "node:http";

describe("Node Server", () => {
  let app: Server<NodeServer>;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("NodeServerAdapter", () => {
    test("remoteAddr returns null when socket has no remoteAddress", () => {
      const adapter = new NodeServerAdapter();
      const ctx = { incomingMessage: { socket: {} } } as any;
      expect(adapter.remoteAddr(ctx)).toBeNull();
    });

    test("remoteAddr returns address info from socket", () => {
      const adapter = new NodeServerAdapter();
      const ctx = {
        incomingMessage: { socket: { remoteAddress: "1.2.3.4", remoteFamily: "IPv4", remotePort: 5000 } },
      } as any;
      expect(adapter.remoteAddr(ctx)).toEqual({ hostname: "1.2.3.4", family: "IPv4", port: 5000 });
    });

    test("getAddress returns unix socket address and toString works", () => {
      const adapter = new NodeServerAdapter();
      const mockServer = { address: () => "/tmp/app.sock" } as any;
      const addr = adapter.getAddress(mockServer);
      expect(addr.hostname).toBe("/tmp/app.sock");
      expect(addr.family).toBe("unix");
      expect(addr.toString()).toBe("/tmp/app.sock");
    });

    test("getAddress throws when server is not listening", () => {
      const adapter = new NodeServerAdapter();
      expect(() => adapter.getAddress({ address: () => null } as any)).toThrow("Server is not listening");
    });
  });

  describe("Node.js Specific Features", () => {
    test("should inject IncomingMessage and ServerResponse in context", async () => {
      app = createApp({ logger: false });
      let rq: IncomingMessage = {} as any;
      let rs: ServerResponse = {} as any;

      const incomingMessage = {} as IncomingMessage;
      const serverResponse = {} as ServerResponse;

      app.get("/users", (ctx) => {
        rq = ctx.incomingMessage;
        rs = ctx.serverResponse;
        return { method: "GET" };
      });

      const response = await app.handle(createRequest("/users"), {
        incomingMessage,
        serverResponse,
      });
      expect(rq).toBe(incomingMessage);
      expect(rs).toBe(serverResponse);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ method: "GET" });
    });
  });
});
