// import { EventEmitter } from "stream";
import { getContext, wrap } from "./context.js";
import { IncomingMessage, ServerResponse } from "http";
import { type Request, type Response } from "../types.js";

// Mock request data
const mockRequestData = {
  method: "GET",
  url: "/example",
  headers: {
    "content-type": "application/json",
    "content-length": "42",
  },
  rawHeaders: ["Content-Type", "application/json", "Content-Length", "42"],
  body: { message: "Hello, World!" },
};

// Create a mock IncomingMessage instance
const mockIncomingMessage = new IncomingMessage(null as any);
Object.assign(mockIncomingMessage, mockRequestData);

class FakeRequest {
  raw = mockIncomingMessage;
}

class FakeResponse {
  raw: ServerResponse = new ServerResponse(fakeRequest.raw);
}
export const fakeRequest: Request = new FakeRequest() as any;
export const fakeResponse: Response = new FakeResponse() as any;
Object.assign(fakeRequest, mockRequestData);

describe("Context", () => {
  describe("getContext", () => {
    test("should be same request", () => {
      wrap(fakeRequest, fakeResponse, () => {
        expect(getContext().req).toBe(fakeRequest);
        expect(getContext().reply).toBe(fakeResponse);
      });
    });
  });
});
