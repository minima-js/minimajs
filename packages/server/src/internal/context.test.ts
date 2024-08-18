// import { EventEmitter } from "stream";
import { mockContext } from "../mock/context.js";
import { getContext, safe } from "./context.js";

describe("Context", () => {
  describe("getContext", () => {
    test("should be same request", () => {
      mockContext((req, res) => {
        expect(getContext().req).toBe(req);
        expect(getContext().reply).toBe(res);
      });
    });
  });
  describe("safe wrap", () => {
    test("getting", () => {
      mockContext(() => {
        expect(getContext()).not.toBeNull();
        safe(() => {
          expect(getContext).toThrow("Unable to access the context beyond the request scope.");
        });
      });
    });
  });
});
