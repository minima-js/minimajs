import { createContext } from "./context.js";
import { wrap } from "./internal/context.js";
import { fakeRequest, fakeResponse } from "./internal/context.test.js";

describe("Context", () => {
  describe("createContext", () => {
    test("setter / getting", () => {
      const [getBody, setBody] = createContext<string>();
      wrap(fakeRequest(), fakeResponse(), () => {
        setBody("Adil");
        expect<string>(getBody()).toBe("Adil");
      });
      wrap(fakeRequest(), fakeResponse(), () => {
        expect(getBody()).toBeUndefined();
      });
    });
  });
});
