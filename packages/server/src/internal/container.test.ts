import { describe, test, expect } from "@jest/globals";
import { inspect } from "node:util";
import { createRootContainer, cloneContainer } from "./container.js";
import { kAppDescriptor, kMiddlewares } from "../symbols.js";
import type { App } from "../interfaces/index.js";

describe("createRootContainer", () => {
  const mockApp = {} as App<unknown>;

  test("$rootMiddleware calls the continuation", async () => {
    const container = createRootContainer(mockApp);
    let called = false;
    await container.$rootMiddleware({} as any, async () => {
      called = true;
      return new Response();
    });
    expect(called).toBe(true);
  });

  test("[inspect.custom] returns an object with symbol-keyed entries", () => {
    const container = createRootContainer(mockApp);
    const result = container[inspect.custom]();
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
  });
});

describe("cloneContainer", () => {
  test("clones array values shallowly", () => {
    const container = createRootContainer({} as App<unknown>);
    const original = container[kAppDescriptor] as any;
    original.push(["x", 1] as any);

    const cloned = cloneContainer(container);
    expect(cloned[kAppDescriptor]).toEqual(original);
    expect(cloned[kAppDescriptor]).not.toBe(original);
  });

  test("clones values with a .clone() method", () => {
    const container = createRootContainer({} as App<unknown>);
    const clonedValue = new Set(["cloned"]);
    const cloneable = { clone: () => clonedValue };
    container[kMiddlewares] = cloneable as any;

    const cloned = cloneContainer(container);
    expect(cloned[kMiddlewares]).toBe(clonedValue);
  });
});
