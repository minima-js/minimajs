import { describe, test, expect, afterEach } from "@jest/globals";
import { createApp } from "./index.js";
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
