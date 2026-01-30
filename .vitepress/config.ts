import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

const tagId = 'GTM-P9NLW275';


const config = defineConfig({
  title: "Minima.js",
  description: "A cutting-edge Node.js framework for modern web applications",
  base: "/",
  srcDir: "docs",
  cleanUrls: true,

   head: [
    [
      'script',
      { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=' + tagId }
    ],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${tagId}');`
    ]
  ],

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
      { text: "Guide", link: "/intro" },
      { text: "Architecture", link: "/core-concepts/architecture" },
      { text: "Cookbook", link: "/cookbook/jwt-authentication" },
      { text: "Advanced", link: "/advanced/index" },
      { text: "API Reference", link: "/api/README" },
      { text: "Packages", link: "/packages/auth" },
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
          { text: "Plugins", link: "/core-concepts/plugins" }, // Updated link
          { text: "Modules", link: "/core-concepts/modules" }, // Updated link
          { text: "Context", link: "/core-concepts/context" },
        ],
      },
      {
        text: "Guides",
        items: [
          { text: "Routing", link: "/guides/routing" },
          { text: "Controllers", link: "/guides/controllers" },
          { text: "HTTP", link: "/guides/http" },
          { text: "Hooks", link: "/guides/hooks" },
          { text: "Error Handling", link: "/guides/error-handling" },
          { text: "Logger", link: "/guides/logger" },
          { text: "Testing", link: "/guides/testing" },
        ],
      },
      {
        text: "Plugins",
        items: [
          { text: "Introduction", link: "/plugins/index" },
          { text: "Body Parser", link: "/plugins/body-parser" },
          { text: "CORS", link: "/plugins/cors" },
          { text: "Proxy", link: "/plugins/proxy" },
          { text: "Express", link: "/plugins/express" },
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
        text: "Advanced",
        items: [
          { text: "Overview", link: "/advanced/index" },
          { text: "Module Discovery", link: "/advanced/module-discovery" },
          { text: "Custom Runtime Adapters", link: "/advanced/custom-adapters" },
          { text: "Container & Encapsulation", link: "/advanced/container-encapsulation" },
        ],
      },
      {
        text: "Packages",
        items: [
          { text: "Auth", link: "/packages/auth" },
          { text: "Schema", link: "/packages/schema" },
          {
            text: "Multipart",
            collapsed: false,
            items: [
              { text: "Overview", link: "/packages/multipart/" },
              { text: "Schema Validation", link: "/packages/multipart/schema" },
            ],
          },
          { text: "Cookie", link: "/packages/cookie" },
        ],
      },
      {
        text: "API Reference",
        link: "/api/README",
      },
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/minima-js/minimajs" },
      { icon: "npm", link: "https://www.npmjs.com/package/@minimajs/server" },
    ],
    search: {
      provider: "local",
    },
  },
});

export default withMermaid(config);