import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import pluginNPM from "@docusaurus/remark-plugin-npm2yarn";

const config: Config = {
  themes: ["@docusaurus/theme-mermaid"],
  markdown: {
    mermaid: true,
  },
  title: "Minimajs",
  favicon: "img/favicon.ico",
  baseUrl: "/",
  url: "http://minimajs.github.io/",
  presets: [
    [
      "@docusaurus/preset-classic",
      {
        docs: {
          routeBasePath: "/",
          remarkPlugins: [pluginNPM],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    /* Your theme config here */
  } satisfies Preset.ThemeConfig,
};

export default config;
