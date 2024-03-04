import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "Minimajs",
  favicon: "img/favicon.ico",
  baseUrl: "/",
  url: "http://minimajs.github.io/",

  /* Your site config here */

  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          routeBasePath: "/",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    /* Your theme config here */
  } satisfies Preset.ThemeConfig,
};

export default config;
