import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import pluginNPM from "@docusaurus/remark-plugin-npm2yarn";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
  themes: ["@docusaurus/theme-mermaid"],
  projectName: "Minimajs",
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
        theme: {
          customCss: "./src/style.css",
        },
        docs: {
          routeBasePath: "/",
          remarkPlugins: [pluginNPM],
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: "Minimajs",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    /* Your theme config here */
  } satisfies Preset.ThemeConfig,
};

export default config;
