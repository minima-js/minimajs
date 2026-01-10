import { describe, test, expect } from "@jest/globals";
import { createContext } from "./context.js";
import { mockContext } from "./mock/index.js";

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
});
