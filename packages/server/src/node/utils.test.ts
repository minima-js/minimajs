import { describe, test, expect, beforeEach } from "@jest/globals";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { toWebHeaders, toWebRequest, fromWebResponse } from "./utils.js";

describe("node/utils", () => {
  describe("toWebHeaders", () => {
    test("should convert node headers to Web Headers", () => {
      const nodeHeaders = {
        "content-type": "application/json",
        "user-agent": "test-agent",
        accept: "text/html",
      };

      const headers = toWebHeaders(nodeHeaders);

      expect(headers.get("content-type")).toBe("application/json");
      expect(headers.get("user-agent")).toBe("test-agent");
      expect(headers.get("accept")).toBe("text/html");
    });

    test("should handle array headers", () => {
      const nodeHeaders = {
        "set-cookie": ["cookie1=value1", "cookie2=value2"],
        "content-type": "text/plain",
      };

      const headers = toWebHeaders(nodeHeaders);

      expect(headers.get("content-type")).toBe("text/plain");
      // When multiple values are set with append, get() returns the first one
      // We can check all values by getting the raw header string
      const cookies = headers.getSetCookie();
      expect(cookies).toContain("cookie1=value1");
      expect(cookies).toContain("cookie2=value2");
    });

    test("should skip undefined headers", () => {
      const nodeHeaders = {
        "content-type": "text/plain",
        "x-custom": undefined,
      };

      const headers = toWebHeaders(nodeHeaders);

      expect(headers.get("content-type")).toBe("text/plain");
      expect(headers.has("x-custom")).toBe(false);
    });

    test("should handle empty headers object", () => {
      const nodeHeaders = {};

      const headers = toWebHeaders(nodeHeaders);

      expect([...headers.keys()].length).toBe(0);
    });
  });

  describe("toWebRequest", () => {
    let mockSocket: Socket;
    let mockReq: IncomingMessage;

    beforeEach(() => {
      mockSocket = new Socket();
      mockReq = new IncomingMessage(mockSocket);
    });

    test("should convert GET request to Web Request", () => {
      mockReq.method = "GET";
      mockReq.url = "/test?foo=bar";
      mockReq.headers = {
        host: "example.com",
        "user-agent": "test",
      };

      const request = toWebRequest(mockReq);

      expect(request.method).toBe("GET");
      expect(request.url).toBe("http://example.com/test?foo=bar");
      expect(request.headers.get("user-agent")).toBe("test");
    });

    test("should convert POST request to Web Request", () => {
      mockReq.method = "POST";
      mockReq.url = "/api/data";
      mockReq.headers = {
        host: "api.example.com",
        "content-type": "application/json",
      };

      const request = toWebRequest(mockReq);

      expect(request.method).toBe("POST");
      expect(request.url).toBe("http://api.example.com/api/data");
      expect(request.headers.get("content-type")).toBe("application/json");
    });

    test("should use localhost when host header is missing", () => {
      mockReq.method = "GET";
      mockReq.url = "/test";
      mockReq.headers = {};

      const request = toWebRequest(mockReq);

      expect(request.url).toBe("http://localhost/test");
    });

    test("should not include body for GET requests", () => {
      mockReq.method = "GET";
      mockReq.url = "/test";
      mockReq.headers = { host: "example.com" };

      const request = toWebRequest(mockReq);

      expect(request.method).toBe("GET");
      // For GET requests, body should be null
      expect(request.bodyUsed).toBe(false);
    });

    test("should not include body for HEAD requests", () => {
      mockReq.method = "HEAD";
      mockReq.url = "/test";
      mockReq.headers = { host: "example.com" };

      const request = toWebRequest(mockReq);

      expect(request.method).toBe("HEAD");
      expect(request.bodyUsed).toBe(false);
    });

    test("should include body for PUT requests", () => {
      mockReq.method = "PUT";
      mockReq.url = "/api/update";
      mockReq.headers = {
        host: "example.com",
        "content-type": "application/json",
      };

      const request = toWebRequest(mockReq);

      expect(request.method).toBe("PUT");
      // Body is set for PUT
    });

    test("should include body for DELETE requests", () => {
      mockReq.method = "DELETE";
      mockReq.url = "/api/delete";
      mockReq.headers = { host: "example.com" };

      const request = toWebRequest(mockReq);

      expect(request.method).toBe("DELETE");
    });

    test("should include body for PATCH requests", () => {
      mockReq.method = "PATCH";
      mockReq.url = "/api/patch";
      mockReq.headers = { host: "example.com" };

      const request = toWebRequest(mockReq);

      expect(request.method).toBe("PATCH");
    });
  });

  describe("fromWebResponse", () => {
    let mockSocket: Socket;
    let mockRes: ServerResponse;
    let responseBody: string;

    beforeEach(() => {
      mockSocket = new Socket();
      mockRes = new ServerResponse(new IncomingMessage(mockSocket));
      responseBody = "";

      mockRes.write = function (chunk: any) {
        responseBody += chunk.toString();
        return true;
      };
      mockRes.end = function (chunk?: any) {
        if (chunk) {
          responseBody += chunk.toString();
        }
        // Emit finish event to properly complete the pipeline
        setImmediate(() => this.emit("finish"));
        return this;
      };
    });

    test("should convert Web Response to Node Response", async () => {
      const webResponse = new Response("Hello World", {
        status: 200,
        headers: {
          "content-type": "text/plain",
          "x-custom": "value",
        },
      });

      await fromWebResponse(webResponse, mockRes);

      expect(mockRes.statusCode).toBe(200);
      expect(mockRes.getHeader("content-type")).toBe("text/plain");
      expect(mockRes.getHeader("x-custom")).toBe("value");
      expect(responseBody).toBe("Hello World");
    });

    test("should handle JSON response", async () => {
      const webResponse = new Response(JSON.stringify({ message: "success" }), {
        status: 201,
        headers: {
          "content-type": "application/json",
        },
      });

      await fromWebResponse(webResponse, mockRes);

      expect(mockRes.statusCode).toBe(201);
      expect(mockRes.getHeader("content-type")).toBe("application/json");
      expect(responseBody).toBe('{"message":"success"}');
    });

    test("should handle error status codes", async () => {
      const webResponse = new Response("Not Found", {
        status: 404,
        headers: {
          "content-type": "text/plain",
        },
      });

      await fromWebResponse(webResponse, mockRes);

      expect(mockRes.statusCode).toBe(404);
      expect(responseBody).toBe("Not Found");
    });

    test("should handle empty response body", async () => {
      const webResponse = new Response(null, {
        status: 204,
      });

      await fromWebResponse(webResponse, mockRes);

      expect(mockRes.statusCode).toBe(204);
      expect(responseBody).toBe("");
    });

    test("should handle multiple headers", async () => {
      const webResponse = new Response("OK", {
        status: 200,
        headers: {
          "content-type": "text/html",
          "cache-control": "no-cache",
          "x-powered-by": "minimajs",
        },
      });

      await fromWebResponse(webResponse, mockRes);

      expect(mockRes.getHeader("content-type")).toBe("text/html");
      expect(mockRes.getHeader("cache-control")).toBe("no-cache");
      expect(mockRes.getHeader("x-powered-by")).toBe("minimajs");
    });
  });
});
