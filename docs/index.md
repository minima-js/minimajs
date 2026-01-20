---
layout: home

hero:
  name: "Minima.js"
  text: "File-Based Modules. Zero Config."
  tagline: |
    Build backends that feel fast and clear—
    file structure becomes your API, hooks are plugins, and everything just works.

  image:
    src: /logo.svg
    alt: Minima.js
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/minima-js/minimajs

features:
  - icon:
      src: /icon-lightning.svg
    title: File-Based Module Auto-Discovery
    details: "Just create folders and module.ts files—routes, hooks, and plugins auto-load. No imports, no registration, no config. Structure matches URLs."
  - icon:
      src: /icon-bun.svg
    title: "100% Bun-Native Compatible"
    details: "First-class Bun support with dedicated imports. Full Node.js compatibility. Same code, different runtime."
  - icon:
      src: /icon-globe.svg
    title: "Web Standards & ESM"
    details: "Native Request/Response objects and pure ESM modules. No wrappers, no abstractions—just standardized, future-proof APIs."
  - icon:
      src: /icon-typescript.svg
    title: TypeScript works with you
    details: |
      APIs are designed for inference, so types flow naturally from usage. You write logic, not generics or config.
  - icon:
      src: /icon-context.svg
    title: "Context-Aware Design"
    details: "AsyncLocalStorage based context. Access request data anywhere without prop drilling."
  - icon:
      src: /icon-function.svg
    title: Composable, but Never Entangled
    details: Powerful hooks, plugins, and isolated modules—compose freely while keeping boundaries explicit and predictable.
---

## File-Based Routing, Zero Config

Organize by features—modules auto-load based on file structure:

::: code-group

```typescript [src/index.ts]
import { createApp } from "@minimajs/server/bun";

const app = createApp(); // Auto-discovers all modules

await app.listen({ port: 3000 });
```

```typescript [src/users/module.ts]
import { body, hook } from "@minimajs/server";
import { bodyParser } from "@minimajs/body-parser";

export const meta = {
  plugins: [
    bodyParser(),
    hook("request", () => console.log("User route hit"))
  ]
};

export default async function(app) {
  app.post("/create", () => {
    const data = body();
    return { message: "User created", data };
  });
  
  app.get("/list", () => {
    return { users: ["Alice", "Bob"] };
  });
}
// ✅ Auto-loaded as /users/*
```

```typescript [src/posts/module.ts]
export default async function(app) {
  app.get("/latest", () => {
    return { posts: [] };
  });
}
// ✅ Auto-loaded as /posts/*
```

:::

**Your file structure = Your API structure**  
No imports. No manual registration. Just create files and go.

<div style="height: 2rem;"></div>

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">Why Minima.js?</h2>
            <p class="details">
              Minima.js removes the friction you’ve learned to tolerate—slow feedback, noisy types, hidden lifecycles, and tangled modules—so building backends feels fast, clear, and predictable again.
            </p>
            <div style="height: 1rem;"></div>
            <a href="/intro" class="VPButton" role="button" style="background-color: var(--vp-c-brand-1); color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.25rem;">
              Learn More
            </a>
          </article>
        </div>
      </div>
    </div>
  </div>
</div>

<div style="height: 4rem;"></div>

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">Join the Community</h2>
            <p class="details">
              Open source and community-driven. Report bugs, suggest features, or contribute code. We'd love to have you on board.
            </p>
            <div style="height: 1rem;"></div>
            <a href="https://github.com/minima-js/minimajs" class="VPButton" role="button" style="background-color: var(--vp-c-brand-1); color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.25rem;">
              Get Involved
            </a>
          </article>
        </div>
      </div>
    </div>
  </div>
</div>
