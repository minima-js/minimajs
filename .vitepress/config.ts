import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const config = defineConfig({
  title: "Minima.js",
  description: "A cutting-edge Node.js framework for modern web applications",
  base: "/",
  srcDir: "docs",
  cleanUrls: true,

  // Vite configuration for Mermaid compatibility
  vite: {
    optimizeDeps: {
      include: ["mermaid", "dayjs", "@braintree/sanitize-url"],
    },
    ssr: {
      noExternal: ["mermaid"],
    },
  },

  // Mermaid configuration
  mermaid: {
    theme: "default",
  },

  // Mermaid plugin configuration
  mermaidPlugin: {
    class: "mermaid",
  },
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
          { text: "Compose", link: "/guides/compose" },
          { text: "Error Handling", link: "/guides/error-handling" },
          { text: "Logger", link: "/guides/logger" },
          { text: "Third-Party Integration", link: "/guides/third-party-integration" },
        ],
      },
      {
        text: "Plugins",
        items: [
          { text: "Introduction", link: "/plugins/index" },
          { text: "Body Parser", link: "/plugins/body-parser" },
          { text: "CORS", link: "/plugins/cors" },
          { text: "Route Logger", link: "/plugins/route-logger" },
          { text: "Graceful Shutdown", link: "/plugins/shutdown" },
        ],
      },
      {
        text: "Cookbook",
        items: [
          { text: "JWT Authentication", link: "/cookbook/jwt-authentication" },
          { text: "File Uploads", link: "/cookbook/file-uploads" },
          { text: "Database Integration", link: "/cookbook/database-integration" },
          { text: "Data Validation with Zod", link: "/cookbook/data-validation" },
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

export default withMermaid(config);
