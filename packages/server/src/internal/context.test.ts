// import { EventEmitter } from "stream";
import { getContext, safeWrap, wrap } from "./context.js";
import { IncomingMessage, ServerResponse } from "http";
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
export const fakeRequest = (data: Dict = {}) => {
  const req: Request = new FakeRequest() as any;
  Object.assign(req, data);
  return req;
};

export const fakeResponse = () => {
  return new FakeResponse() as any as Response;
};

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
        safeWrap(() => {
          expect(getContext).toThrow("Unable to access the context beyond the request scope.");
        });
      });
    });
  });
});
