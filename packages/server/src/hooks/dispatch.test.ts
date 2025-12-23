import { jest } from "@jest/globals";
import { createApp, type App, type HookCallback } from "../index.js";
import { getContext } from "../context.js";

describe("dispatch", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app?.close());

  it("should dispatch onSent hooks", async () => {
    const hook = jest.fn<HookCallback>();
    app.get("/", () => {
      const { hooks } = getContext();
      hooks.onSent.add(hook);
      return "done";
    });
    await app.inject({ url: "/" });
    await app.close();
    app = null as any;
    expect(hook).toHaveBeenCalled();
  });

  it("should dispatch onError hooks", async () => {
    const hook = jest.fn();
    const error = new Error("test error");
    app.get("/", () => {
      const { hooks } = getContext();
      hooks.onError.add(hook);
      throw error;
    });
    await app.inject({ url: "/" });
    await app.close();
    app = null as any;
    expect(hook).toHaveBeenCalledWith(error);
  });
});
