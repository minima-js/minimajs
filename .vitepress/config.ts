import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { withPwa } from "@vite-pwa/vitepress";
import llmstxt from "vitepress-plugin-llms";

const tagId = 'GTM-P9NLW275';
const hostname = 'https://minimajs.com';

const toCanonicalPath = (pathname: string): string => {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
};

const toCanonicalUrl = (value: string): string => {
  try {
    const url = new URL(value, hostname);
    url.pathname = toCanonicalPath(url.pathname);
    return url.toString();
  } catch {
    return value;
  }
};

const keywords = [
  // Brand
  'minimajs', 'minima.js',
  // Runtime
  'nodejs framework', 'bun framework', 'typescript framework',
  // Core features
  'file-based routing', 'module discovery', 'scope isolation',
  'async local storage', 'context-aware', 'request context',
  'hook system', 'plugin system', 'lifecycle hooks',
  // API style
  'rest api framework', 'web api native', 'esm', 'bun server', 'node http server',
  // Comparisons
  'lightweight framework', 'fastify alternative', 'hono alternative', 'express alternative',
  // Ecosystem
  'zod validation', 'jwt auth', 'multipart upload', 'openapi', 'graceful shutdown',
];


const config = defineConfig({
  title: "Minima.js",
  description: "A cutting-edge Node.js framework for modern web applications",
  base: "/",
  srcDir: "docs",
  cleanUrls: true,
  sitemap: {
    hostname,
    transformItems(items) {
      return items.map((item) => ({
        ...item,
        url: toCanonicalUrl(item.url),
      }));
    },
  },

   head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['link', { rel: 'icon', type: 'image/png', href: '/logo.png' }],
    ['link', { rel: 'apple-touch-icon', href: '/logo.png' }],

    // LLM discovery
    ['link', { rel: 'llms', href: `${hostname}/llms.txt` }],
    ['link', { rel: 'llms-full', href: `${hostname}/llms-full.txt` }],

    // Meta
    ['meta', { name: 'theme-color', content: '#eb4432' }],
    ['meta', { name: 'keywords', content: keywords.join(', ') }],
    ['meta', { name: 'author', content: 'Minima.js Team' }],

    // Open Graph
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Minima.js' }],
    ['meta', { property: 'og:description', content: 'A cutting-edge Node.js framework for modern web applications' }],
    ['meta', { property: 'og:image', content: `${hostname}/logo.png` }],
    ['meta', { property: 'og:url', content: hostname }],
    ['meta', { property: 'og:site_name', content: 'Minima.js' }],

    // Twitter
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'Minima.js' }],
    ['meta', { name: 'twitter:description', content: 'A cutting-edge Node.js framework for modern web applications' }],
    ['meta', { name: 'twitter:image', content: `${hostname}/logo.png` }],

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
    plugins: [llmstxt()],
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
      { text: "Advanced", link: "/advanced" },
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
        text: "Tutorial",
        items: [
          {
            text: "Task Board API",
            collapsed: true,
            items: [
              { text: "Overview", link: "/tutorials/task-board-api" },
              { text: "1. Project Setup", link: "/tutorials/task-board-api/01-setup" },
              { text: "2. Database & Root Module", link: "/tutorials/task-board-api/02-database" },
              { text: "3. Authentication", link: "/tutorials/task-board-api/03-auth" },
              { text: "4. Workspaces", link: "/tutorials/task-board-api/04-workspaces" },
              { text: "5. Boards & Tasks", link: "/tutorials/task-board-api/05-boards-tasks" },
              { text: "6. Members & Roles", link: "/tutorials/task-board-api/06-members" },
              { text: "7. Error Handling & Polish", link: "/tutorials/task-board-api/07-errors-polish" },
              { text: "Presentation Playbook", link: "/tutorials/task-board-api/presentation-playbook" },
            ],
          },
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
          { text: "Route Descriptors", link: "/guides/route-descriptors" },
        ],
      },
      {
        text: "Plugins",
        items: [
          { text: "Introduction", link: "/plugins" },
          { text: "Descriptor", link: "/plugins/descriptor" },
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
          { text: "Overview", link: "/advanced" },
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
          { text: "OpenAPI", link: "/packages/openapi" },
          {
            text: "Multipart",
            collapsed: true,
            items: [
              { text: "Overview", link: "/packages/multipart" },
              { text: "Schema Validation", link: "/packages/multipart/schema" },
              { text: "Helpers", link: "/packages/multipart/helpers" },
            ],
          },
          { text: "Cookie", link: "/packages/cookie" },
          {
            text: "Disk",
            collapsed: true,
            items: [
              { text: "Overview", link: "/packages/disk" },
              { text: "Plugins", link: "/packages/disk/plugins" },
              { text: "Protocol Disk", link: "/packages/disk/protocol-disk" },
              { text: "AWS S3", link: "/packages/disk/aws-s3" },
              { text: "Azure Blob", link: "/packages/disk/azure-blob" },
              { text: "Filesystem", link: "/packages/disk/filesystem" },
              { text: "Memory", link: "/packages/disk/memory" },
            ],
          },
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
