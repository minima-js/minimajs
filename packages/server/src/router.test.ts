import { type App, createApp } from "./index.js";
import { routeLogger } from "./router.js";
import chalk from "chalk";
import { jest } from "@jest/globals";

describe("routeLogger", () => {
  let app: App;

  beforeEach(() => {
    app = createApp({ routes: { log: false } });

    app.get("/route1", async (_, reply) => {
      reply.send("route1");
    });

    app.post("/route2", async (_, reply) => {
      reply.send("route2");
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("should log routes with default options using console.log and chalk", async () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});

    await app.register(routeLogger);
    await app.ready();

    const printedRoutes = app.printRoutes({ commonPrefix: false });
    expect(spy).toHaveBeenCalledWith(chalk.magenta(printedRoutes));

    spy.mockRestore();
  });

  it("should use custom logger when provided", async () => {
    const mockLogger = jest.fn();

    await app.register(routeLogger, { logger: mockLogger });
    await app.ready();

    const printedRoutes = app.printRoutes({ commonPrefix: false });
    expect(mockLogger).toHaveBeenCalledWith(chalk.magenta(printedRoutes));
  });

  it("should use custom formatter when provided", async () => {
    const mockLogger = jest.fn();
    const mockFormatter = jest.fn((routes) => `formatted: ${routes}`);

    await app.register(routeLogger, {
      logger: mockLogger,
      formatter: mockFormatter,
    });
    await app.ready();

    const printedRoutes = app.printRoutes({ commonPrefix: false });
    expect(mockFormatter).toHaveBeenCalledWith(printedRoutes);
    expect(mockLogger).toHaveBeenCalledWith(`formatted: ${printedRoutes}`);
  });

  it("should respect commonPrefix option", async () => {
    const mockLogger = jest.fn();

    await app.register(routeLogger, {
      logger: mockLogger,
      commonPrefix: true,
    });
    await app.ready();

    const printedRoutes = app.printRoutes({ commonPrefix: true });
    expect(mockLogger).toHaveBeenCalledWith(chalk.magenta(printedRoutes));
  });

  it("should log routes only when app is ready", async () => {
    const mockLogger = jest.fn();

    await app.register(routeLogger, { logger: mockLogger });

    // Should not have been called yet
    expect(mockLogger).not.toHaveBeenCalled();

    await app.ready();

    // Should be called after ready
    expect(mockLogger).toHaveBeenCalledTimes(1);
  });
});
