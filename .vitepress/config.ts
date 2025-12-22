import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Minima.js",
  description: "A cutting-edge Node.js framework for modern web applications",
  base: "/",
  srcDir: "docs",

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
        items: [{ text: "Getting Started", link: "/guide/getting-started" }],
      },
      {
        text: "Guide",
        items: [
          { text: "Routing", link: "/guide/routing" },
          { text: "Context", link: "/guide/context" },
          { text: "HTTP", link: "/guide/http" },
          { text: "Middleware", link: "/guide/middleware" },
          { text: "Hooks", link: "/guide/hooks" },
          { text: "Module", link: "/guide/module" },
          { text: "Error Handling", link: "/guide/error" },
          { text: "Logger", link: "/guide/logger" },
          { text: "Graceful Shutdown", link: "/guide/graceful-shutdown" },
        ],
      },
      {
        text: "Packages",
        items: [
          { text: "Auth", link: "/packages/auth" },
          { text: "Schema", link: "/packages/schema" },
          { text: "Multipart", link: "/packages/multipart" },
          { text: "Cookie", link: "/packages/cookie" },
        ],
      },
      {
        text: "API Reference",
        items: [{ text: "Overview", link: "/api/" }],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/minima-js/minimajs" }],

    search: {
      provider: "local",
    },
  },
});
