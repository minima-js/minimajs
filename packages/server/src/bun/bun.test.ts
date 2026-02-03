import { describe, test, expect, afterEach } from "@jest/globals";
import type { Server as BunServer } from "bun";
import { createApp } from "./index.js";
import type { Server } from "../core/index.js";

describe("Bun Server", () => {
  let app: Server<BunServer<unknown>>;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe("createApp integration", () => {
    test("should create an app using Bun adapter", () => {
      app = createApp({ moduleDiscovery: false, logger: false });
      expect(app).toBeDefined();
      expect(app.router).toBeDefined();
      expect(app.container).toBeDefined();
    });
  });
});
