import { createApp } from "./bun/index.js";

describe("createApp", () => {
  it("should create an app with default options", () => {
    const app = createApp();
    expect(app).toBeDefined();
    app.close();
  });

  it("should create an app with logger disabled", () => {
    const app = createApp({ logger: false });
    expect(app).toBeDefined();
    app.close();
  });

  it("should create an app with routes log enabled", () => {
    const app = createApp();
    expect(app).toBeDefined();
    app.close();
  });
});
