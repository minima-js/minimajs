import { createAttribute } from "./attribute.js";

function getValues() {
  return {
    firstName: "John",
    lastName: "Doe",
    company: "Google",
    duration: "21243",
    number: 1234,
    tags: ["hello", "world"],
  } satisfies Record<string, unknown>;
}
function throwAttributeError(name: string, message: string): never {
  throw new Error(`${name}:${message}`);
}

describe("attribute", () => {
  describe("createAttribute", () => {
    const getAttribute = createAttribute(getValues, throwAttributeError, true);

    test("getting undefined property", () => {
      expect(() => getAttribute("hello")).toThrow("hello:value is undefined");
    });

    test("getting defined property", () => {
      expect(getAttribute("firstName")).toBe("John");
    });

    test("getting defined property", () => {
      expect(getAttribute("firstName")).toBe("John");
    });

    test("casting to number", () => {
      expect(getAttribute("duration", Number)).toBe(21243);
    });

    test("casting array to string", () => {
      expect(getAttribute("tags", String)).toBe("hello,world");
    });

    test("invalid casting", () => {
      expect(() => getAttribute("tags", Number)).toThrow("tags:value is NaN");
    });

    // with default casting
    const getOptionalAttribute = createAttribute(getValues, throwAttributeError, false);

    test("default optional", () => {
      expect(getOptionalAttribute("hello")).toBeUndefined();
    });

    const getStringAttribute = createAttribute(getValues, throwAttributeError, false, String);
    test("default casting", () => {
      expect(getStringAttribute("number")).toBe("1234");
    });
  });
});
