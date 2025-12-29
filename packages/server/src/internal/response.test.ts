import { type App } from "../interfaces/app.js";
import { createApp } from "../bun/index.js";
import { createRequest } from "../mock/request.js";

describe("internal/response", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false });
  });

  afterEach(() => app.close());

  describe("handleResponse", () => {
    test("plain string response", async () => {
      app.get("/", () => {
        return "hello world";
      });
      const response = await app.inject("/");
      expect(response.body).toBe("hello world");
    });

    test("plain object synchronous response", async () => {
      app.get("/", () => {
        return { message: "hello world" };
      });
      const response = await app.inject("/");
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async  response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.inject("/");
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("plain object async synchronous response", async () => {
      app.get("/", async () => {
        return { message: "hello world" };
      });
      const response = await app.inject(createRequest("/"));
      expect(response.body).toBe(JSON.stringify({ message: "hello world" }));
    });

    test("async iterator response with error", async () => {
      async function* generator() {
        yield "hello";
        yield " ";
        throw new Error("test");
      }
      app.get("/", () => {
        return generator();
      });
      try {
        await app.inject("/");
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
  });
});
