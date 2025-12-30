import type { PluginOptions as _, PluginOptions as __ } from "../interfaces/plugin.js";
import { plugin } from "../internal/plugins.js";
import { createApp } from "./index.js";

const app = createApp();

app.register((app) => {
  console.log("something cool", app.router);
});

app.register<{ email: string }>(async (app, opt) => {
  console.log("something cool", app.router, opt.email);
});

app.register<{ email: string }>(
  plugin((app, opt) => {
    console.log("something cool", app.router, opt.email); // this should fail, because prefix doesnt exists
  })
);
