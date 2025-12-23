import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Minima.js",
  description: "A cutting-edge Node.js framework for modern web applications",
  base: "/",
  srcDir: "docs",
  cleanUrls: true,
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/intro" },
      { text: "Cookbook", link: "/cookbook/jwt-authentication" },
      { text: "Packages", link: "/packages/auth" },
      { text: "API Reference", link: "/api/README" },
    ],

    sidebar: [
      {
        text: "Introduction",
        items: [
          { text: "What is Minima.js?", link: "/intro" },
          { text: "Minima.js vs Crowd", link: "/minimajs-vs-crowd" },
          { text: "Getting Started", link: "/getting-started" },
        ],
      },
      {
        text: "Core Concepts",
        items: [
          { text: "Architecture", link: "/core-concepts/architecture" },
          { text: "Application", link: "/core-concepts/application" },
          { text: "Context", link: "/core-concepts/context" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Routing", link: "/guides/routing" },
          { text: "HTTP", link: "/guides/http" },
          { text: "Modules", link: "/guides/modules" },
          { text: "Middleware", link: "/guides/middleware" },
          { text: "Hooks", link: "/guides/hooks" },
          { text: "Error Handling", link: "/guides/error-handling" },
          { text: "Logger", link: "/guides/logger" },
          { text: "Third-Party Integration", link: "/guides/third-party-integration" },
        ],
      },
      {
        text: "Plugins",
        items: [
          { text: "Route Logger", link: "/guides/route-logger" },
          { text: "Graceful Shutdown", link: "/guides/graceful-shutdown" },
        ],
      },
      {
        text: "Cookbook",
        items: [
          { text: "JWT Authentication", link: "/cookbook/jwt-authentication" },
          { text: "File Uploads", link: "/cookbook/file-uploads" },
          { text: "Database Integration", link: "/cookbook/database-integration" },
          { text: "Data Validation with Yup", link: "/cookbook/data-validation" },
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
        link: "/api/README",
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/minima-js/minimajs" }],
    search: {
      provider: "local",
    },
  },
});
