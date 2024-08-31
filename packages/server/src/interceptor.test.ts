import { createApp, interceptor } from "./index.js";
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
    app.register(
      interceptor([async () => hello()], async (app) => {
        app.get("/hello", () => {
          return "hello";
        });
      })
    );
    app.get("/", () => "welcome home");
    const response = await app.inject({ url: "/" });
    expect(response.body).toBe("welcome home");
    expect(hello).not.toHaveBeenCalled();
    const response2 = await app.inject({ url: "/hello" });
    expect(response2.body).toBe("hello");
    expect(hello).toHaveBeenCalled();
  });
});
