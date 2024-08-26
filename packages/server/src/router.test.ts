import { type App, createApp } from "./index.js";
import chalk from "chalk";
import { logRoutes } from "./router.js";
import { jest } from "@jest/globals";

describe("logRoutes", () => {
  let app: App;

  let spy: jest.SpiedFunction<any>;

  beforeEach(() => {
    // Create a new Fastify instance before each test
    app = createApp({ routes: { log: false } });

    // Add some routes to the app
    app.get("/route1", async (_, reply) => {
      reply.send("route1");
    });

    app.post("/route2", async (_, reply) => {
      reply.send("route2");
    });

    // Mock console.log
    spy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    // Restore console.log after each test
    await app.close();
    spy.mockClear();
  });

  it("should log the routes using chalk", () => {
    // Call the logRoutes function
    logRoutes(app);

    // Get the printed routes as a string
    const printedRoutes = app.printRoutes({
      commonPrefix: false,
    });

    // Check that console.log was called with the expected output
    expect(console.log).toHaveBeenCalledWith(chalk.magenta(printedRoutes));
  });
});
