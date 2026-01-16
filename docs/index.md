---
layout: home

hero:
  name: "Minima.js"
  text: "Thoughtfully Designed for Modern Runtimes"
  tagline: |
    Most frameworks optimize features.
    Minima.js optimizes how it feels to work every day.

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
    title: Designed from scratch for modern runtimes
    details: with carefully selected, battle-tested primitives where they make sense
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
