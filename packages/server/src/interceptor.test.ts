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
        app.get("/", () => {
          return "hello";
        });
      })
    );

    await app.inject({ url: "/" });
    expect(hello).toHaveBeenCalled();
  });
});
