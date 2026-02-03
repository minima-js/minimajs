import { mockContext } from "../mock/index.js";
import { context as context, safe } from "../context.js";

describe("Context", () => {
  describe("getContext", () => {
    test("should be same request", () => {
      mockContext((ctx) => {
        expect(context()).toBe(ctx);
      });
    });
  });
  describe("safe wrap", () => {
    test("getting", () => {
      mockContext(() => {
        expect(context()).not.toBeNull();
        const data = safe((name: string) => {
          expect(context).toThrow("context() was called outside of a request scope");
          return "i am clean, " + name;
        });
        expect(data("Adil")).toBe("i am clean, Adil");
      });
    });
  });
});
