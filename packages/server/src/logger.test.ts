import { createApp } from "./index.js";
import { mixin } from "./logger.js";

describe("Logger", () => {
  describe("mixin function", () => {
    it("should return data with module name if present", async () => {
      const app = createApp({ routes: { log: false } });
      app.get("/", function homePage() {
        const result = mixin({});
        expect(result).toEqual({ name: "fastify:homePage" });
        return "done";
      });
      await app.inject({ url: "/" });
      await app.close();
    });
  });
});
