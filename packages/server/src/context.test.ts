import { createContext } from "./context.js";
import { contextStorage } from "./internal/context.js";

describe("Context", () => {
  describe("createContext", () => {
    test("setter / getting", () => {
      const [getBody, setBody] = createContext();
      contextStorage.run({ local: new Map() } as any, () => {
        setBody("Adil");
        expect(getBody()).toBe("Adil");
      });
      contextStorage.run({ local: new Map() } as any, () => {
        expect(getBody()).toBeUndefined();
      });
    });
  });
});
