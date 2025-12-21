import { defineConfig } from "vitepress";
import path from "path";
import fs from "fs";

export default defineConfig({
  title: "Minima.js",
  description: "A cutting-edge Node.js framework for modern web applications",
  base: "/",
  srcDir: "docs",
  cleanUrls: true,

  markdown: {
    config: (md) => {
      const defaultRender = md.render.bind(md);
      md.render = (src, env) => {
        // Replace custom include paths for package docs
        src = src.replace(
          /<!--@include:\s*@packages\/([^/]+)\/(.+?)-->/g,
          (match, packageName, filePath) => {
            const includePath = path.resolve(
              __dirname,
              `../../${packageName}/${filePath}`
            );
            try {
              return fs.readFileSync(includePath, "utf-8");
            } catch (err) {
              console.error(`Failed to include: ${includePath}`, err);
              return `<!-- Error: Could not include ${includePath} -->`;
            }
          }
        );
        return defaultRender(src, env);
      };
    },
  },

  themeConfig: {
    logo: "/logo.svg",

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Packages", link: "/packages/auth" },
      { text: "API Reference", link: "/api/readme" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "MinimaJS vs Others", link: "/minimajs-vs-crowd" },
        ],
      },
      {
        text: "Guide",
        items: [
          { text: "Routing", link: "/guide/routing" },
          { text: "Context", link: "/guide/context" },
          { text: "HTTP", link: "/guide/http" },
          { text: "Middleware", link: "/guide/middleware" },
          { text: "Module", link: "/guide/module" },
          { text: "Error Handling", link: "/guide/error" },
          { text: "Logger", link: "/guide/logger" },
          { text: "Plugin", link: "/guide/plugin" },
          { text: "Graceful Shutdown", link: "/guide/graceful-shutdown" },
        ],
      },
      {
        text: "Packages",
        items: [
          { text: "Auth", link: "/packages/auth" },
          { text: "Schema", link: "/packages/schema" },
          { text: "Multipart", link: "/packages/multipart" },
          { text: "Cookies", link: "/packages/cookie" },
        ],
      },
      {
        text: "API Reference",
        items: [{ text: "Overview", link: "/api/readme" }],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/minima-js/minimajs" }],

    search: {
      provider: "local",
    },
  },
});
