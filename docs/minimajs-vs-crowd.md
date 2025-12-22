---
title: "MinimaJS vs. The Crowd"
sidebar_position: 2
---

# MinimaJS vs. Other Frameworks

Choosing the right Node.js framework can be overwhelming. This guide compares MinimaJS with popular alternatives to help you make an informed decision.

## Quick Comparison Table

| Feature | MinimaJS | Express | Fastify | NestJS | Hono | Elysia |
|---------|----------|---------|---------|--------|------|--------|
| **Performance** | ⚡⚡⚡ Fast | 🐌 Slow | ⚡⚡⚡ Fast | ⚡⚡ Medium | ⚡⚡⚡ Fast | ⚡⚡⚡ Fast |
| **TypeScript** | ✅ First-class | ⚠️ Community | ✅ Built-in | ✅ Required | ✅ First-class | ✅ First-class |
| **Learning Curve** | 📉 Low | 📉 Low | 📊 Medium | 📈 High | 📉 Low | 📊 Medium |
| **Bundle Size** | 🪶 Small | 🪶 Small | 📦 Medium | 📦📦 Large | 🪶 Tiny | 🪶 Small |
| **Context API** | ✅ Built-in | ❌ Manual | ❌ Manual | ✅ DI Container | ✅ Built-in | ✅ Built-in |
| **Runtime** | Node.js | Node.js | Node.js | Node.js | Multi-runtime | Bun |
| **Validation** | Optional | External | External | Class-validator | Built-in | Built-in |
| **DX** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## MinimaJS vs Express.js

### Performance
```typescript
// Express - Slow middleware chain
app.use(express.json());
app.use(cookieParser());
app.use(session());

app.post('/users/:id', (req, res) => {
  const userId = req.params.id;
  const body = req.body;
  res.json({ userId, body });
});
```

```typescript
// MinimaJS - 2-3x faster, built on Fastify
import { createApp, params, body } from '@minimajs/server';

const app = createApp();

app.post('/users/:id', () => {
  const userId = params.get('id');
  const data = body();
  return { userId, data };
});
```

### Context Handling
```typescript
// Express - Prop drilling nightmare
function validateUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.get('/profile', validateUser, async (req, res) => {
  const user = req.user; // Passed through middleware
  const data = await getProfile(req.user.id);
  res.json(data);
});
```

```typescript
// MinimaJS - No prop drilling, context-aware
import { createAuth } from '@minimajs/auth';

const auth = createAuth(async (token) => {
  return await validateToken(token);
});

app.get('/profile', auth.guard(), async () => {
  const user = auth.user(); // Available anywhere
  const data = await getProfile(user.id);
  return data;
});
```

### TypeScript Support
- **Express**: Community types (`@types/express`), often outdated
- **MinimaJS**: First-class TypeScript with full type inference

---

## MinimaJS vs Fastify

MinimaJS is built on top of Fastify, so you get all the performance benefits plus:

### Developer Experience
```typescript
// Fastify - Verbose plugin system
import Fastify from 'fastify';

const fastify = Fastify({ logger: true });

fastify.register(async (instance) => {
  instance.get('/user/:id', async (request, reply) => {
    const { id } = request.params;
    const user = await getUser(id);
    return reply.send(user);
  });
});
```

```typescript
// MinimaJS - Clean and simple
import { createApp, params } from '@minimajs/server';

const app = createApp();

app.get('/user/:id', async () => {
  const id = params.get('id');
  return await getUser(id);
});
```

### Context Management
```typescript
// Fastify - Manual context passing
fastify.decorateRequest('db', null);

fastify.addHook('onRequest', async (request) => {
  request.db = await getDBConnection();
});

fastify.get('/posts', async (request) => {
  return await request.db.posts.findMany();
});
```

```typescript
// MinimaJS - Automatic context handling
import { context } from '@minimajs/server';

app.get('/posts', async () => {
  const db = context().local.get('db');
  return await db.posts.findMany();
});
```

### Key Advantages
- ✅ No request/reply parameters needed
- ✅ Built-in context API for data sharing
- ✅ Simplified plugin system
- ✅ Better TypeScript inference
- ✅ Same performance as Fastify

---

## MinimaJS vs NestJS

### Architecture Philosophy
```typescript
// NestJS - Heavy OOP, decorators, DI containers
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService
  ) {}

  @Get(':id')
  @UseGuards(AuthGuard)
  async getUser(@Param('id') id: string, @Req() request) {
    return this.usersService.findOne(id);
  }
}
```

```typescript
// MinimaJS - Lightweight, functional
import { createApp, params } from '@minimajs/server';
import { createAuth } from '@minimajs/auth';

const app = createApp();
const auth = createAuth(validateUser);

app.get('/users/:id', auth.guard(), async () => {
  const id = params.get('id');
  return await usersService.findOne(id);
});
```

### Bundle Size & Build Time
| Framework | Bundle Size | Cold Start | Build Time |
|-----------|-------------|------------|------------|
| **MinimaJS** | ~2 MB | < 100ms | Fast |
| **NestJS** | ~15 MB | ~500ms | Slow |

### Learning Curve
- **NestJS**: Requires understanding of Angular patterns, decorators, DI, modules, providers
- **MinimaJS**: If you know Express or Fastify, you already know 80% of MinimaJS

### When to Choose What
**Choose NestJS if:**
- You're building a large enterprise application
- You need GraphQL, microservices, WebSockets out of the box
- Your team is familiar with Angular
- You want opinionated structure

**Choose MinimaJS if:**
- You want high performance with simplicity
- You prefer functional programming over OOP
- You need fast build times and small bundles
- You want flexibility without boilerplate

---

## MinimaJS vs Hono

Hono is excellent for edge/multi-runtime environments. Here's how they compare:

### Runtime Support
```typescript
// Hono - Multi-runtime (Cloudflare Workers, Deno, Bun)
import { Hono } from 'hono';

const app = new Hono();

app.get('/hello', (c) => {
  return c.json({ message: 'Hello' });
});

export default app; // Works on Cloudflare Workers
```

```typescript
// MinimaJS - Node.js optimized
import { createApp } from '@minimajs/server';

const app = createApp();

app.get('/hello', () => {
  return { message: 'Hello' };
});

await app.listen({ port: 3000 });
```

### Context API Comparison
```typescript
// Hono - Context object passed everywhere
app.get('/user/:id', async (c) => {
  const id = c.req.param('id');
  const auth = c.req.header('Authorization');
  return c.json({ id, auth });
});
```

```typescript
// MinimaJS - Global context, no parameters
import { params, headers } from '@minimajs/server';

app.get('/user/:id', async () => {
  const id = params.get('id');
  const auth = headers.get('authorization');
  return { id, auth };
});
```

### When to Choose What
**Choose Hono if:**
- You're deploying to Cloudflare Workers, Deno Deploy, or Bun
- You need edge runtime compatibility
- You want a tiny bundle for serverless

**Choose MinimaJS if:**
- You're deploying to Node.js servers
- You need better TypeScript inference
- You want richer ecosystem (Fastify plugins)
- You prefer zero-parameter handlers

---

## MinimaJS vs Elysia (Bun)

Elysia is built specifically for Bun runtime with impressive performance.

### Runtime Dependency
```typescript
// Elysia - Bun only
import { Elysia } from 'elysia';

const app = new Elysia()
  .get('/user/:id', ({ params }) => {
    return { id: params.id };
  })
  .listen(3000);
```

```typescript
// MinimaJS - Node.js (mature ecosystem)
import { createApp, params } from '@minimajs/server';

const app = createApp();

app.get('/user/:id', () => {
  return { id: params.get('id') };
});

await app.listen({ port: 3000 });
```

### Type Safety
Both have excellent TypeScript support, but:

- **Elysia**: Uses Bun's type system, very fast type checking
- **MinimaJS**: Uses standard TypeScript, works with all tooling

### Ecosystem
- **Elysia**: Growing ecosystem, Bun-specific
- **MinimaJS**: Access to entire Fastify plugin ecosystem

### When to Choose What
**Choose Elysia if:**
- You're committed to Bun runtime
- You need maximum performance
- You don't need Node.js compatibility

**Choose MinimaJS if:**
- You need Node.js compatibility
- You want access to mature npm ecosystem
- You're deploying to standard hosting (AWS, GCP, Azure)
- You need production stability

---

## Migration Paths

### From Express to MinimaJS

```typescript
// Before (Express)
const express = require('express');
const app = express();

app.use(express.json());

app.get('/users/:id', (req, res) => {
  const id = req.params.id;
  const query = req.query.include;
  res.json({ id, query });
});

app.listen(3000);
```

```typescript
// After (MinimaJS)
import { createApp, params, searchParams } from '@minimajs/server';

const app = createApp();

app.get('/users/:id', () => {
  const id = params.get('id');
  const query = searchParams.get('include');
  return { id, query };
});

await app.listen({ port: 3000 });
```

### From Fastify to MinimaJS

```typescript
// Before (Fastify)
import Fastify from 'fastify';

const fastify = Fastify();

fastify.get('/users/:id', async (request, reply) => {
  const { id } = request.params;
  return { id };
});

await fastify.listen({ port: 3000 });
```

```typescript
// After (MinimaJS)
import { createApp, params } from '@minimajs/server';

const app = createApp();

app.get('/users/:id', () => {
  const id = params.get('id');
  return { id };
});

await app.listen({ port: 3000 });
```

---

## Performance Benchmarks

Based on internal testing (similar to Fastify benchmarks):

| Framework | Req/sec | Latency (avg) | Throughput |
|-----------|---------|---------------|------------|
| **MinimaJS** | ~68,000 | 1.4ms | 10.2 MB/sec |
| **Fastify** | ~68,000 | 1.4ms | 10.2 MB/sec |
| **Hono** | ~65,000 | 1.5ms | 9.8 MB/sec |
| **Express** | ~24,000 | 4.2ms | 3.6 MB/sec |
| **NestJS** | ~22,000 | 4.5ms | 3.3 MB/sec |

*Note: MinimaJS has the same performance as Fastify since it's built on top of it.*

---

## Summary: Why Choose MinimaJS?

### ✅ Choose MinimaJS When You Want:

1. **Performance**: Fastify-level speed (2-3x faster than Express)
2. **Simplicity**: Express-like simplicity with modern features
3. **TypeScript**: First-class TypeScript without ceremony
4. **Context API**: No more prop drilling or middleware chains
5. **Flexibility**: Not as opinionated as NestJS
6. **Small Bundle**: Minimal overhead, tree-shakeable
7. **Node.js**: Mature runtime with proven ecosystem

### ❌ Consider Alternatives When You Need:

- **NestJS**: If you need opinionated structure, GraphQL, microservices architecture
- **Hono**: If you're deploying to edge/serverless (Cloudflare Workers, Deno)
- **Elysia**: If you're committed to Bun runtime exclusively
- **Express**: If you have a massive existing codebase and migration isn't worth it

---

## The MinimaJS Sweet Spot

MinimaJS excels at:

- 🚀 **REST APIs**: Fast, type-safe, minimal boilerplate
- 🔐 **Authentication**: Built-in auth with context management
- 📁 **File Uploads**: Powerful multipart handling
- ✅ **Validation**: Optional schema validation with Yup
- 🔄 **Middleware**: Simplified interceptors and hooks
- 📦 **Modular**: Use only what you need

**Bottom Line**: MinimaJS is the perfect balance between Express's simplicity and NestJS's features, with Fastify's performance and modern TypeScript-first design.

---

## Try It Yourself

```bash
npm create minima@latest my-app
cd my-app
npm run dev
```

Start building your next Node.js application with the power of Fastify and the simplicity of Express! 🚀