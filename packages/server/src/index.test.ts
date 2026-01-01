import { describe, test, expect } from "@jest/globals";
import { createApp } from "./bun/index.js";

describe("createApp", () => {
  test("should create an app with default options", () => {
    const app = createApp();
    expect(app).toBeDefined();
    app.close();
  });

  test("should create an app with logger disabled", () => {
    const app = createApp({ logger: false });
    expect(app).toBeDefined();
    app.close();
  });

  test("should create an app with routes log enabled", () => {
    const app = createApp();
    expect(app).toBeDefined();
    app.close();
  });
});
