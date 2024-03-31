import { createAttribute } from "./attribute.js";

function getValues() {
  return {
    firstName: "John",
    lastName: "Doe",
    company: "Google",
    duration: "21243",
    number: 1234,
    tags: ["hello", "world"],
  };
}
function throwAttributeError(name: string, message: string): never {
  throw new Error(`${name}:${message}`);
}

describe("attribute", () => {
  describe("createAttribute", () => {
    // required default
    const getAttribute = createAttribute(getValues, throwAttributeError, true);

    test("getting undefined property", () => {
      expect<() => string | number | string[]>(() => getAttribute("hello")).toThrow("hello:is required");
    });

    test("getting defined property", () => {
      expect<string | number | string[]>(getAttribute("firstName")).toBe("John");
    });

    test("getting defined property", () => {
      expect<string | number | string[]>(getAttribute("firstName")).toBe("John");
    });

    test("casting to number", () => {
      expect<number>(getAttribute("duration", Number)).toBe(21243);
    });
    test("casting array to string", () => {
      expect<string[]>(getAttribute("tags")).toStrictEqual(["hello", "world"]);
    });

    test("casting array to string", () => {
      expect<string>(getAttribute("tags", String)).toBe("hello,world");
    });

    test("invalid casting", () => {
      expect(() => getAttribute("tags", Number)).toThrow("tags:expects a number, received 'hello,world'");
    });

    // default optional
    const getOptionalAttribute = createAttribute(getValues, throwAttributeError, false, String);

    test("default optional", () => {
      const hello = getOptionalAttribute("hello");

      // @ts-expect-error
      expect(() => hello.toString()).toThrow();

      expect(hello).toBeUndefined();
    });

    test("default optional force required to be undefined", () => {
      expect(() => {
        const hello = getOptionalAttribute("hello", true);
        return hello.toString();
      }).toThrow();
    });

    test("default optional force required to be defined", () => {
      const hello = getOptionalAttribute("company", true);
      // @ts-expect-error
      isNumber(hello);
      isAnyOf<string | number | string[]>(hello);
      expect(hello).toBeDefined();
    });

    const getStringAttribute = createAttribute(getValues, throwAttributeError, false, String);
    test("default casting", () => {
      expect(getStringAttribute("number")).toBe("1234");
    });
  });
});

function isNumber<T>(_val: T extends number ? T : never) {}

function isAnyOf<T>(_val: T) {}
