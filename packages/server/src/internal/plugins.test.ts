import { createPlugin, createPluginSync } from "./plugins.js";

describe("plugins", () => {
  describe("createPluginSync", () => {
    test("it should have skip override", () => {
      const plugin: any = createPluginSync((_, __, done) => {
        done();
      });
      expect(plugin[Symbol.for("skip-override")]).toBeTruthy();
    });

    test("it should have a name", () => {
      const plugin: any = createPluginSync((_, __, done) => {
        done();
      }, "hello world");
      expect(plugin[Symbol.for("skip-override")]).toBeTruthy();
      expect(plugin[Symbol.for("fastify.display-name")]).toBe("hello world");
    });
  });

  describe("createPlugin", () => {
    test("it should set override and accept a async function", () => {
      const plugin: any = createPlugin(async (_, __) => {});
      expect(plugin[Symbol.for("skip-override")]).toBeTruthy();
    });
    test("it should set override and accept a async function set a name", () => {
      const plugin: any = createPlugin(async (_, __) => {}, "hello world");
      expect(plugin[Symbol.for("skip-override")]).toBeTruthy();
      expect(plugin[Symbol.for("fastify.display-name")]).toBeTruthy();
    });
  });
});
