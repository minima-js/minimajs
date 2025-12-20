import { mockContext } from "../mock/context.js";
import { context, safe } from "./context.js";

describe("Context", () => {
  describe("getContext", () => {
    test("should be same request", () => {
      mockContext((req, res) => {
        expect(context().req).toBe(req);
        expect(context().reply).toBe(res);
      });
    });
  });
  describe("safe wrap", () => {
    test("getting", () => {
      mockContext(() => {
        expect(context()).not.toBeNull();
        const data = safe((name: string) => {
          expect(context).toThrow("Unable to access the context beyond the request scope.");
          return "i am clean, " + name;
        });
        expect(data("Adil")).toBe("i am clean, Adil");
      });
    });
  });
});
