import { jest } from "@jest/globals";

jest.unstable_mockModule("../../internal/plugins.js", () => ({
  createPluginSync: jest.fn((fn) => fn),
}));

const { createErrorDecoratorHandler } = await import("./error-decorator.js");
import type { App, Request } from "../../types.js";

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
    const [createDecorator, _getDecorated] = createErrorDecoratorHandler();
    const mockCallback = jest.fn();
    const mockOptions = { filter: jest.fn(() => true) };
    createDecorator(mockCallback)(app, mockOptions, jest.fn());

    expect(app.decorate).toHaveBeenCalledWith(expect.any(Symbol), expect.any(Set));
  });

  it("should throw the original error if no decorators are present", async () => {
    const [_, getDecorated] = createErrorDecoratorHandler();
    const mockRequest = {} as Request;
    const initialError = new Error("something went wrong");
    expect(getDecorated(app, mockRequest, initialError)).rejects.toThrow(initialError);
  });
});
