import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { withPwa } from "@vite-pwa/vitepress";

const tagId = 'GTM-P9NLW275';


const config = defineConfig({
  title: "Minima.js",
  description: "A cutting-edge Node.js framework for modern web applications",
  base: "/",
  srcDir: "docs",
  cleanUrls: true,

   head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/logo.png' }],

    // Meta
    ['meta', { name: 'theme-color', content: '#eb4432' }],
    ['meta', { name: 'keywords', content: 'nodejs, typescript, web framework, bun, esm, rest api, backend, server, minimajs' }],
    ['meta', { name: 'author', content: 'Minima.js Team' }],

    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Minima.js' }],
    ['meta', { property: 'og:description', content: 'A cutting-edge Node.js framework for modern web applications' }],
    ['meta', { property: 'og:image', content: '/logo.png' }],
    ['meta', { property: 'og:url', content: 'https://minimajs.com' }],
    ['meta', { property: 'og:site_name', content: 'Minima.js' }],

    // Twitter
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'Minima.js' }],
    ['meta', { name: 'twitter:description', content: 'A cutting-edge Node.js framework for modern web applications' }],
    ['meta', { name: 'twitter:image', content: '/logo.png' }],

    // Analytics
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

  // PWA configuration
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Minima.js",
      short_name: "Minima.js",
      description: "A cutting-edge Node.js framework for modern web applications",
      theme_color: "#eb4432",
      icons: [
        {
          src: "/logo.png",
          sizes: "200x200",
          type: "image/png",
        },
        {
          src: "/logo.svg",
          sizes: "any",
          type: "image/svg+xml",
        },
      ],
    },
    workbox: {
      globPatterns: ["**/*.{css,js,html,svg,png,ico,txt,woff2}"],
    },
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
          { text: "Middleware", link: "/guides/middleware" },
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
          { text: "Context Provider", link: "/advanced/context-provider" },
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
              { text: "Helpers", link: "/packages/multipart/helpers" },
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

export default withPwa(withMermaid(config));