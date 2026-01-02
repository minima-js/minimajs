---
layout: home

hero:
  name: "Minima.js"
  text: "Built from Scratch for Modern Runtimes"
  tagline: A high-performance web framework built from the ground up with 100% Bun-native support, Web API standards, and a revolutionary hook-based control system.
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
  - icon: '⚡️'
    title: 'Built from Scratch, Not a Wrapper'
    details: 'Unlike other frameworks, Minima.js is engineered from the ground up with zero dependencies on legacy frameworks. Pure, efficient, and blazingly fast.'
  - icon: '🦊'
    title: '100% Bun-Native Compatible'
    details: 'First-class support for Bun with dedicated native imports. Leverage Bun''s full performance potential while maintaining Node.js compatibility.'
  - icon: '🌐'
    title: 'Web API Standard'
    details: 'Uses native Request/Response objects from the Web API standard. No wrappers, no abstractions—just pure, standardized web APIs.'
  - icon: '🎣'
    title: 'Revolutionary Hook System'
    details: 'Control your application flow with an intuitive hook-based architecture. Intercept, transform, and manage requests at any lifecycle stage with simple functions.'
  - icon: '✨'
    title: 'Context-Aware Design'
    details: 'Access request data from anywhere using AsyncLocalStorage-based context. No prop drilling, no passing req/res around—just clean, elegant code.'
  - icon: '🎨'
    title: 'Function-First Philosophy'
    details: 'Pure functional approach with minimal boilerplate. Build modular applications using plain async functions and composable plugins.'

---
<div style="height: 1rem;"></div>

## Choose Your Runtime

::: code-group

```typescript [Bun]
import { createApp } from '@minimajs/server/bun';
import { params } from '@minimajs/server';

const app = createApp();

// Access route params via AsyncLocalStorage - no prop drilling!
app.get('/:name', () => `Hello, ${params.get('name')}!`);

await app.listen({ port: 3000 });
```

```typescript [Node.js]
import { createApp } from '@minimajs/server/node';
import { params } from '@minimajs/server';

const app = createApp();

// Access route params via AsyncLocalStorage - no prop drilling!
app.get('/:name', () => `Hello, ${params.get('name')}!`);

await app.listen({ port: 3000 });
```

:::

<div style="height: 2rem;"></div>

---

<div style="height: 2rem;"></div>

<div class="VPFeatures" style="--vp-features-gap: 2rem; --vp-features-max-items-per-row: 1;">
  <div class="container">
    <div class="items">
      <div class="item grid-1">
        <div class="VPLink no-arrow" href="#">
          <article class="VPFeature">
            <h2 class="title">A Fresh Start for Web Frameworks</h2>
            <p class="details">
              Minima.js breaks free from the traditional approach of wrapping existing frameworks. Built entirely from scratch, it embraces modern runtime capabilities like Bun while maintaining backward compatibility with Node.js. By using standard Web APIs instead of creating custom abstractions, Minima.js delivers unparalleled performance and a development experience that feels native to the JavaScript ecosystem. The unique hook-based control system gives you fine-grained control over every aspect of the request lifecycle—without the complexity.
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