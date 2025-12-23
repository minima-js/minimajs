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
      { text: "Guide", link: "/intro" },
      { text: "Cookbook", link: "/cookbook/jwt-authentication" },
      { text: "Packages", link: "/packages/auth" },
      { text: "API Reference", link: "/api/readme" },
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
        items: [
          { text: "Overview", link: "/api/" },
          {
            text: "@minimajs/server",
            items: [
              { text: "createApp", link: "/api/@minimajs/server/functions/createApp.md" },
              { text: "abort", link: "/api/@minimajs/server/functions/abort.md" },
              { text: "body", link: "/api/@minimajs/server/functions/body.md" },
              { text: "defer", link: "/api/@minimajs/server/functions/defer.md" },
              { text: "headers", link: "/api/@minimajs/server/functions/headers.md" },
              { text: "hook", link: "/api/@minimajs/server/functions/hook.md" },
              { text: "interceptor", link: "/api/@minimajs/server/functions/interceptor.md" },
              { text: "middleware", link: "/api/@minimajs/server/functions/middleware.md" },
              { text: "params", link: "/api/@minimajs/server/functions/params.md" },
              { text: "plugin", link: "/api/@minimajs/server/functions/plugin.md" },
              { text: "redirect", link: "/api/@minimajs/server/functions/redirect.md" },
              { text: "request", link: "/api/@minimajs/server/functions/request.md" },
              { text: "response", link: "/api/@minimajs/server/functions/response.md" },
              { text: "searchParams", link: "/api/@minimajs/server/functions/searchParams.md" },
            ],
          },
          {
            text: "@minimajs/auth",
            items: [
              { text: "createAuth", link: "/api/@minimajs/auth/functions/createAuth.md" },
              { text: "UnauthorizedError", link: "/api/@minimajs/auth/classes/UnauthorizedError.md" },
            ],
          },
          {
            text: "@minimajs/schema",
            items: [
              { text: "createBody", link: "/api/@minimajs/schema/functions/createBody.md" },
              { text: "createHeaders", link: "/api/@minimajs/schema/functions/createHeaders.md" },
              { text: "createSearchParams", link: "/api/@minimajs/schema/functions/createSearchParams.md" },
              { text: "ValidationError", link: "/api/@minimajs/schema/classes/ValidationError.md" },
            ],
          },
          {
            text: "@minimajs/multipart",
            items: [
              { text: "isFile", link: "/api/@minimajs/multipart/functions/isFile.md" },
              { text: "File", link: "/api/@minimajs/multipart/classes/File.md" },
            ],
          },
          {
            text: "@minimajs/cookie",
            items: [
              { text: "cookies", link: "/api/@minimajs/cookie/functions/cookies.md" },
              { text: "plugin", link: "/api/@minimajs/cookie/functions/plugin.md" },
            ],
          },
        ],
      },
    ],

    socialLinks: [{ icon: "github", link: "https://github.com/minima-js/minimajs" }],

    search: {
      provider: "local",
    },
  },
});
