import { describe, test, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { createApp } from "../../bun/index.js";
import type { App } from "../../interfaces/index.js";
import { routeLogger } from "./index.js";
import { EOL } from "node:os";

describe("routeLogger", () => {
  let app: App;

  beforeEach(() => {
    app = createApp();
    app.get("/route1", async () => {
      return "route1";
    });
    app.post("/route2", async () => {
      return "route2";
    });
  });

  afterEach(async () => {
    await app.close();
  });

  test("should log routes with default options using app.log.info", async () => {
    const spy = jest.spyOn(app.log, "info").mockImplementation(() => {});

    app.register(routeLogger({ groupBy: "path" }));
    await app.ready();

    const printedRoutes = EOL + app.router.prettyPrint({ commonPrefix: false }) + EOL;
    expect(spy).toHaveBeenCalledWith(printedRoutes);

    spy.mockRestore();
  });

  test("should use custom logger when provided", async () => {
    const mockLogger = jest.fn();
    app.register(routeLogger({ logger: mockLogger, groupBy: "path" }));
    await app.ready();

    const printedRoutes = app.router.prettyPrint({ commonPrefix: false });
    expect(mockLogger).toHaveBeenCalledWith(printedRoutes);
  });

  test("should use custom formatter when provided", async () => {
    const mockLogger = jest.fn();

    app.register(
      routeLogger({
        logger: mockLogger,
        groupBy: "path",
      })
    );
    await app.ready();

    const printedRoutes = app.router.prettyPrint({ commonPrefix: false });
    expect(mockLogger).toHaveBeenCalledWith(`${printedRoutes}`);
  });

  test("should log routes only when app is ready", async () => {
    const mockLogger = jest.fn();
    app.register(routeLogger({ logger: mockLogger }));
    expect(mockLogger).not.toHaveBeenCalled();
    await app.ready();
    expect(mockLogger).toHaveBeenCalledTimes(1);
  });

  test("enabled: false removes previously registered route logger", async () => {
    const mockLogger = jest.fn();
    app.register(routeLogger({ logger: mockLogger }));
    app.register(routeLogger({ enabled: false }));
    await app.ready();
    expect(mockLogger).not.toHaveBeenCalled();
  });
});
