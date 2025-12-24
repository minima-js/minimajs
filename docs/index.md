---
layout: home

hero:
  name: "Minima.js"
  text: "The Modern Node.js Framework"
  tagline: Build fast, scalable, and maintainable web applications with a TypeScript-first, context-aware, and minimalist framework.
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
      src: /icon-rocket.svg
    title: "TypeScript First"
    details: "Built entirely in TypeScript, for TypeScript. Enjoy a top-tier developer experience with excellent type safety and autocompletion."
  - icon:
      src: /icon-sparkles.svg
    title: "Context over req/res"
    details: "Say goodbye to prop drilling! Access request data from anywhere in your code using a modern, AsyncLocalStorage-based context."
  - icon:
      src: /icon-zap.svg
    title: "Modern JavaScript, Today"
    details: "Built for the future. Minima.js exclusively uses modern ECMAScript Modules (ESM) and the latest JavaScript features."
  - icon:
      src: /icon-function.svg
    title: "Functional Programming"
    details: "Embrace a clean, functional approach with composable middleware and plugins. Write declarative, testable code without classes or decorators."
  - icon:
      src: /icon-plug.svg
    title: "Effortless Integration"
    details: "Seamlessly integrate any third-party library or package. The context system eliminates prop drilling, making integrations clean and simple."
  - icon:
      src: /icon-grid.svg
    title: "Minimalist and Opinionated"
    details: 'A "one-rule of doing things" philosophy results in a consistent and predictable codebase with minimal boilerplate.'
---

<div style="height: 1rem;"></div>

## As Easy As It Gets

```typescript
import { createApp, params } from "@minimajs/server";

const app = createApp();

app.get("/:name", () => `Hello, ${params.get("name")}!`);

await app.listen({ port: 3000 });
```

<div style="height: 2rem;"></div>

---

<div style="height: 2rem;"></div>

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">Designed for the Modern Developer</h2>
            <p class="details">
              Minima.js is for developers who value performance, type safety, and a modern development experience. We believe that building web applications should be a joy, not a chore. That's why we've designed a framework that is both powerful and easy to use. With Minima.js, you can focus on writing your application's logic, not on boilerplate code.
            </p>
          </article>
        </div>
      </div>
    </div>
  </div>
</div>

<div style="height: 2rem;"></div>

---

<div style="height: 2rem;"></div>

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">Join the Community</h2>
            <p class="details">
              Minima.js is an open-source project, and we welcome contributions from the community. Whether you want to report a bug, suggest a new feature, or contribute to the code, we would love to have you on board. Check out our GitHub repository to get started.
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
