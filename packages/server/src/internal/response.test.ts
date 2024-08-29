import { createApp, type App } from "../index.js";
describe("internal/response", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ routes: { log: false } });
  });

  afterEach(() => app.close());
  describe("handleResponse", () => {
    test("plain string response", async () => {
      app.get("/", () => {
        return "hello world";
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe("hello world");
    });

    test("plain object synchronous response", async () => {
      app.get("/", () => {
        return { message: "hello world" };
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async  response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async synchronous response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.inject({ url: "/" });
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });
  });
});
