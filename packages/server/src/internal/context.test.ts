// import { EventEmitter } from "stream";
import { IncomingMessage, ServerResponse } from "node:http";
import { getContext, safe, wrap } from "./context.js";
import { type Dict, type Request, type Response } from "../types.js";

// Mock request data
const mockRequestData = {
  method: "GET",
  url: "/example",
  headers: {
    "content-type": "application/json",
    "content-length": "42",
  },
  rawHeaders: ["Content-Type", "application/json", "Content-Length", "42"],
};

// Create a mock IncomingMessage instance
const mockIncomingMessage = new IncomingMessage(null as any);
Object.assign(mockIncomingMessage, mockRequestData);

class FakeRequest {
  raw = mockIncomingMessage;
}

class FakeResponse {
  raw: ServerResponse = new ServerResponse(mockIncomingMessage);
}
export const fakeRequest = (data: Dict = {}, raw: Dict = {}) => {
  const req: Request = new FakeRequest() as any;
  Object.assign(req, data);
  Object.assign(req.raw, raw);
  return req;
};

export const fakeResponse = () => {
  return new FakeResponse() as any as Response;
};

export function mockContext(cb: () => void) {
  return wrap(fakeRequest(), fakeResponse(), cb);
}

describe("Context", () => {
  describe("getContext", () => {
    test("should be same request", () => {
      const req = fakeRequest(),
        res = fakeResponse();
      wrap(req, res, () => {
        expect(getContext().req).toBe(req);
        expect(getContext().reply).toBe(res);
      });
    });
  });
  describe("safe wrap", () => {
    test("getting", () => {
      wrap(fakeRequest(), fakeResponse(), () => {
        expect(getContext()).not.toBeNull();
        safe(() => {
          expect(getContext).toThrow("Unable to access the context beyond the request scope.");
        });
      });
    });
  });
});
