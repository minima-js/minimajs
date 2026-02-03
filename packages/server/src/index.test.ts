import { describe, test, expect } from "@jest/globals";
import { createApp } from "./bun/index.js";

describe("createApp", () => {
  test("should create an app with default options", () => {
    const app = createApp({ moduleDiscovery: false });
    expect(app).toBeDefined();
    app.close();
  });
});
