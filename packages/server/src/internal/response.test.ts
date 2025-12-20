import { createApp, type App } from "../index.js";
import { createAbortController, ResponseAbort, isRequestAbortedError } from "./response.js";
import { EventEmitter } from "node:events";
import { IncomingMessage, ServerResponse } from "node:http";

describe("internal/response", () => {
  let app: App;
  beforeEach(() => {
    app = createApp({ logger: false, routes: { log: false } });
  });

  afterEach(() => app.close());

  describe("createAbortController", () => {
    test("should abort the controller when response closes and message is destroyed", () => {
      const mockMessage = new EventEmitter() as IncomingMessage;
      mockMessage.destroyed = false; // Initially not destroyed

      const mockResponse = new EventEmitter() as ServerResponse;

      const controller = createAbortController(mockMessage, mockResponse);

      expect(controller.signal.aborted).toBe(false);

      // Simulate message being destroyed
      mockMessage.destroyed = true;
      // Simulate response closing
      mockResponse.emit("close");

      expect(controller.signal.aborted).toBe(true);
      expect(controller.signal.reason).toBe(ResponseAbort);
    });

    test("should not abort the controller when response closes but message is not destroyed", () => {
      const mockMessage = new EventEmitter() as IncomingMessage;
      mockMessage.destroyed = false;

      const mockResponse = new EventEmitter() as ServerResponse;

      const controller = createAbortController(mockMessage, mockResponse);

      expect(controller.signal.aborted).toBe(false);

      // Do NOT simulate message being destroyed
      // Simulate response closing
      mockResponse.emit("close");

      expect(controller.signal.aborted).toBe(false);
    });
  });

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
        await app.inject({ url: "/" });
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });
  });

  describe("isRequestAbortedError", () => {
    test("should return true for aborted error", () => {
      const error = new Error("test");
      (error as any).cause = ResponseAbort;
      expect(isRequestAbortedError(error)).toBe(true);
    });

    test("should return false for other errors", () => {
      const error = new Error("test");
      expect(isRequestAbortedError(error)).toBe(false);
    });
  });
});
