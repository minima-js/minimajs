---
layout: home

hero:
  name: "Minima.js"
  text: "Thoughtfully Designed for Modern Runtimes"
  tagline: TypeScript-first with pure ESM, Web API standards. Real types, no false assertions.
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
    title: "Battle-Tested Foundation"
    details: "Built on proven libraries like find-my-way and avvio. Modern API design meets production-ready reliability."
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
    title: "100% Type Safety"
    details: "TypeScript-first with zero type assertions. Real generics, and full inference — no 'as any' shortcuts."
  - icon:
      src: /icon-context.svg
    title: "Context-Aware Design"
    details: "AsyncLocalStorage-based context. Access request data anywhere without prop drilling."
  - icon:
      src: /icon-function.svg
    title: "Function-First Philosophy"
    details: "Pure functional approach. Plain async functions, composable plugins, zero boilerplate."
---

## Quick Example

::: code-group

```typescript [Bun]
import { createApp } from "@minimajs/server/bun";
import { body } from "@minimajs/server"; // [!code highlight]

const app = createApp();

app.post("/users", async () => {
  const data = await body(); // [!code highlight]
  return { message: "User created", data };
});

await app.listen({ port: 3000 });
```

```typescript [Node.js]
import { createApp } from "@minimajs/server/node";
import { body } from "@minimajs/server"; // [!code highlight]

const app = createApp();

app.post("/users", async () => {
  const data = await body(); // [!code highlight]
  return { message: "User created", data };
});

await app.listen({ port: 3000 });
```

:::

<div style="height: 2rem;"></div>

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">Why Minima.js?</h2>
            <p class="details">
              Traditional frameworks carry decades of compatibility baggage and outdated patterns. Minima.js takes a different path: built entirely from scratch for modern JavaScript runtimes, using Web API standards, with zero legacy overhead. The result? Blazing performance, exceptional developer experience, and code that's portable and future-proof.
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
