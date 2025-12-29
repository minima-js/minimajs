import { context, createContext } from "./context.js";
import { mockContext } from "./mock/index.js";
import { jest } from "@jest/globals";

describe("Context", () => {
  describe("createContext", () => {
    test("setter / getting", () => {
      const [getBody, setBody] = createContext<string>();
      mockContext(() => {
        setBody("Adil");
        expect<string>(getBody()).toBe("Adil");
      });
      mockContext(() => {
        expect(getBody()).toBeUndefined();
      });
    });

    test("default value callback", () => {
      const [getBody, setBody] = createContext<string>(() => "Not Assigned");
      mockContext(() => {
        expect<string>(getBody()).toBe("Not Assigned");
        setBody("Adil");
        expect<string>(getBody()).toBe("Adil");
      });
    });

    test("default value", () => {
      const [getBody, setBody] = createContext<string>("Not Assigned");
      mockContext(() => {
        expect<string>(getBody()).toBe("Not Assigned");
        setBody("Adil");
        expect<string>(getBody()).toBe("Adil");
      });
    });
  });

  // once.test.ts
  describe("once", () => {
    it("should only call the callback once per request", () => {
      mockContext(() => {
        const mockCallback = jest.fn(() => "result");
        const handleRequest = context.once(mockCallback);

        // First call: callback should be called
        const firstCallResult = handleRequest();
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(firstCallResult).toBe("result");

        // Second call: callback should not be called again
        const secondCallResult = handleRequest();
        expect(mockCallback).toHaveBeenCalledTimes(1); // still 1, because callback should not be called again
        expect(secondCallResult).toBe("result");
      });
    });

    it("should handle different instances independently", () => {
      mockContext(() => {
        const mockCallback1 = jest.fn(() => "result1");
        const mockCallback2 = jest.fn(() => "result2");

        const handleRequest1 = context.once(mockCallback1);
        const handleRequest2 = context.once(mockCallback2);

        // Call the first function
        const result1 = handleRequest1();
        expect(mockCallback1).toHaveBeenCalledTimes(1);
        expect(result1).toBe("result1");

        // Call the second function
        const result2 = handleRequest2();
        expect(mockCallback2).toHaveBeenCalledTimes(1);
        expect(result2).toBe("result2");

        // Subsequent calls should not invoke the callbacks again
        handleRequest1();
        handleRequest2();
        expect(mockCallback1).toHaveBeenCalledTimes(1);
        expect(mockCallback2).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("memo", () => {
    it("should only call the callback once per request", () => {
      mockContext(() => {
        const mockCallback = jest.fn(() => "result");
        const handleRequest = context.memo(mockCallback);

        // First call: callback should be called
        const firstCallResult = handleRequest();
        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(firstCallResult).toBe("result");

        // Second call: callback should not be called again
        const secondCallResult = handleRequest();
        expect(mockCallback).toHaveBeenCalledTimes(1); // still 1, because callback should not be called again
        expect(secondCallResult).toBe("result");
      });
    });

    it("should handle different instances independently", () => {
      mockContext(() => {
        const mockCallback1 = jest.fn(() => "result1");
        const mockCallback2 = jest.fn(() => "result2");

        const handleRequest1 = context.memo(mockCallback1);
        const handleRequest2 = context.memo(mockCallback2);

        // Call the first function
        const result1 = handleRequest1();
        expect(mockCallback1).toHaveBeenCalledTimes(1);
        expect(result1).toBe("result1");

        // Call the second function
        const result2 = handleRequest2();
        expect(mockCallback2).toHaveBeenCalledTimes(1);
        expect(result2).toBe("result2");

        // Subsequent calls should not invoke the callbacks again
        handleRequest1();
        handleRequest2();
        expect(mockCallback1).toHaveBeenCalledTimes(1);
        expect(mockCallback2).toHaveBeenCalledTimes(1);
      });
    });
  });
});
