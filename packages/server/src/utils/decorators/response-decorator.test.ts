import { jest } from "@jest/globals";

jest.unstable_mockModule("../../internal/plugins.js", () => ({
  createPluginSync: jest.fn((fn) => fn),
}));

const { createResponseDecoratorHandler } = await import("./response-decorator.js");
import type { App, Request } from "../../types.js";
import type { DecoratorOptions } from "./helpers.js";

describe("createDecoratorHandler", () => {
  let app: App;
  beforeEach(() => {
    app = {
      decorate: jest.fn(),
      [Symbol("test")]: undefined,
    } as unknown as App;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should add a decorator to the app", () => {
    const [createDecorator, _getDecorated] = createResponseDecoratorHandler();
    const mockCallback = jest.fn();
    const mockOptions: DecoratorOptions = { filter: jest.fn(() => true) };
    createDecorator(mockCallback)(app, mockOptions, jest.fn());

    expect(app.decorate).toHaveBeenCalledWith(expect.any(Symbol), expect.any(Set));
  });

  it("should return the original parameter if no decorators are present", async () => {
    const [_, getDecorated] = createResponseDecoratorHandler();

    const mockRequest = {} as Request;
    const initialParam = "initial";

    const result = await getDecorated(app, mockRequest, initialParam);

    expect(result).toBe(initialParam);
  });
});
