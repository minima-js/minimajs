import { createApp, getRoute, middleware } from "./index.js";
import type { App } from "./types.js";
import { jest } from "@jest/globals";

describe("middleware", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ routes: { log: false } });
  });
  afterEach(() => app.close());
  test("should call middleware function", async () => {
    const hello = jest.fn().mockReturnValue(Promise.resolve());
    app.register(middleware(async () => hello()));
    app.get("/", () => {
      return "hello";
    });
    await app.inject({ url: "/" });
    expect(hello).toHaveBeenCalled();
  });

  test("should call middleware function on specific route", async () => {
    const hello = jest.fn().mockReturnValue(Promise.resolve());
    app.register(
      middleware(async () => hello()),
      { filter: () => getRoute().url === "/hello" }
    );
    app.get("/", () => {
      return "home";
    });
    app.get("/hello", () => {
      return "hello";
    });
    await app.inject({ url: "/" });
    expect(hello).not.toHaveBeenCalled();
    await app.inject({ url: "/hello" });
    expect(hello).toHaveBeenCalled();
  });
});
