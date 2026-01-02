---
title: Getting Started
sidebar_position: 2
tags:
  - installation
  - app
  - tutorial
---

# Getting Started: Building a Todo App

Welcome to Minima.js! This guide will walk you through the process of building a simple but complete Todo application. By the end of this tutorial, you will have a good understanding of the basic concepts of Minima.js and be able to build your own web applications.

## Prerequisites

Before you start, choose your runtime and make sure you have it installed:

**Option 1: Bun (Recommended for Maximum Performance)**
*   [Bun](https://bun.sh/) (v1.0 or higher) - Fast, modern JavaScript runtime
*   A text editor (we recommend [VS Code](https://code.visualstudio.com/))
*   A command-line interface (CLI) like Terminal or Command Prompt

**Option 2: Node.js (For Compatibility)**
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   A text editor (we recommend [VS Code](https://code.visualstudio.com/))
*   A command-line interface (CLI) like Terminal or Command Prompt

## 1. Project Setup

First, let's create a new directory for our project and initialize it.

**For Bun:**
```bash
mkdir minimajs-todo-app
cd minimajs-todo-app
bun init -y
```

**For Node.js:**
```bash
mkdir minimajs-todo-app
cd minimajs-todo-app
npm init -y
```

If using Node.js, we need to tell it that we are using ECMAScript Modules (ESM). Open your `package.json` file and add `"type": "module"`:

```json
{
  "name": "minimajs-todo-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "bun run src/index.ts"
  }
}
```

## 2. Installation

Now, let's install `@minimajs/server`, the core package for building Minima.js applications.

**For Bun:**
```bash
bun add @minimajs/server
```

**For Node.js:**
```bash
npm install @minimajs/server
```

## 3. Creating the Server

Create a `src` directory and a file named `index.ts` inside it. This will be the entry point of our application.

```bash
mkdir src
touch src/index.ts
```

Now, let's create a basic server. Open `src/index.ts` and add the following code:

::: code-group

```typescript [Bun]
import { createApp } from '@minimajs/server/bun';

const app = createApp();

app.get('/', () => 'Hello, World!');

await app.listen({ port: 3000 });

console.log('Server listening on http://localhost:3000');
```

```typescript [Node.js]
import { createApp } from '@minimajs/server/node';

const app = createApp();

app.get('/', () => 'Hello, World!');

await app.listen({ port: 3000 });

console.log('Server listening on http://localhost:3000');
```

:::

Notice the import path difference: `@minimajs/server/bun` for Bun and `@minimajs/server/node` for Node.js. This gives you native runtime integration with zero overhead.

## 4. Building the Todo App

Now, let's build the Todo application. We will create a simple in-memory "database" to store our todos and define routes for creating, reading, updating, and deleting todos.

Replace the content of `src/index.ts` with the following code:

::: code-group

```typescript [Bun]
import { createApp } from '@minimajs/server/bun';
import { body, params } from '@minimajs/server';

const app = createApp();

// In-memory "database" for todos
let todos = [
  { id: 1, text: 'Learn Minima.js', completed: false },
  { id: 2, text: 'Build a Todo app', completed: false },
];

// GET /todos - Get all todos
app.get('/todos', () => todos);

// GET /todos/:id - Get a single todo
app.get('/todos/:id', () => {
  const id = params.get('id', Number); // Parse with optional callback
  const todo = todos.find(t => t.id === id);
  return todo || { message: 'Todo not found' };
});

// POST /todos - Create a new todo
app.post('/todos', () => {
  const { text } = body<{ text: string }>(); // Parse request body
  const newTodo = {
    id: todos.length + 1,
    text,
    completed: false,
  };
  todos.push(newTodo);
  return newTodo;
});

// PUT /todos/:id - Update a todo
app.put('/todos/:id', () => {
  const id = params.get('id', Number);
  const { text, completed } = body<{ text?: string; completed?: boolean }>();
  const todo = todos.find(t => t.id === id);

  if (!todo) {
    return { message: 'Todo not found' };
  }

  if (text !== undefined) {
    todo.text = text;
  }

  if (completed !== undefined) {
    todo.completed = completed;
  }

  return todo;
});

// DELETE /todos/:id - Delete a todo
app.delete('/todos/:id', () => {
  const id = params.get('id');
  const index = todos.findIndex(t => t.id === id);

  if (index === -1) {
    return { message: 'Todo not found' };
  }

  todos.splice(index, 1);
  return { message: 'Todo deleted' };
});


await app.listen({ port: 3000 });

console.log('Server listening on http://localhost:3000');
```

```typescript [Node.js]
import { createApp } from '@minimajs/server/node';
import { body, params } from '@minimajs/server';

const app = createApp();

// In-memory "database" for todos
let todos = [
  { id: 1, text: 'Learn Minima.js', completed: false },
  { id: 2, text: 'Build a Todo app', completed: false },
];

// GET /todos - Get all todos
app.get('/todos', () => todos);

// GET /todos/:id - Get a single todo
app.get('/todos/:id', () => {
  const id = params.get('id', Number); // Parse with optional callback
  const todo = todos.find(t => t.id === id);
  return todo || { message: 'Todo not found' };
});

// POST /todos - Create a new todo
app.post('/todos', () => {
  const { text } = body<{ text: string }>(); // Parse request body
  const newTodo = {
    id: todos.length + 1,
    text,
    completed: false,
  };
  todos.push(newTodo);
  return newTodo;
});

// PUT /todos/:id - Update a todo
app.put('/todos/:id', () => {
  const id = params.get('id', Number);
  const { text, completed } = body<{ text?: string; completed?: boolean }>();
  const todo = todos.find(t => t.id === id);

  if (!todo) {
    return { message: 'Todo not found' };
  }

  if (text !== undefined) {
    todo.text = text;
  }

  if (completed !== undefined) {
    todo.completed = completed;
  }

  return todo;
});

// DELETE /todos/:id - Delete a todo
app.delete('/todos/:id', () => {
  const id = params.get('id');
  const index = todos.findIndex(t => t.id === id);

  if (index === -1) {
    return { message: 'Todo not found' };
  }

  todos.splice(index, 1);
  return { message: 'Todo deleted' };
});


await app.listen({ port: 3000 });

console.log('Server listening on http://localhost:3000');
```

:::

## 5. Running the Application

::: code-group

```bash [Bun]
bun run src/index.ts
```

```bash [Node.js]
# Install tsx for TypeScript support
npm install -D tsx

# Run the application
npx tsx src/index.ts
```

:::

You should see the message `Server listening on http://localhost:3000` in your console.

You can now use a tool like `curl` or Postman to interact with your Todo API:

*   **`GET http://localhost:3000/todos`**: Get all todos.
*   **`POST http://localhost:3000/todos`** with body `{"text": "My new todo"}`: Create a new todo.
*   **`PUT http://localhost:3000/todos/1`** with body `{"completed": true}`: Update a todo.
*   **`DELETE http://localhost:3000/todos/1`**: Delete a todo.

## Understanding Context Access

In the examples above, we used `params.get('id', Number)` and `body()` to access request data. Minima.js provides **two ways** to access context:

### 1. Via AsyncLocalStorage (Recommended)

Import context utilities from `@minimajs/server` and use them anywhere:

```typescript
import { params, body, request } from '@minimajs/server';

app.get('/users/:id', () => {
  const id = params.get('id', Number); // With parser callback
  const user = getUserById(id);
  return user;
});

app.post('/users', () => {
  const userData = body<{ name: string; email: string }>();
  return createUser(userData);
});

// Access native Web API Request
app.get('/info', () => {
  const req = request();
  return {
    url: req.url,
    method: req.method,
    userAgent: req.headers.get('user-agent')
  };
});
```

**Available context functions:**
- `params()` - Get all route params as object
- `params.get(key, parser?)` - Get single param with optional parser
- `body()` - Parse request body (supports types)
- `request()` - Get native Web API Request object
- `headers` - Access request headers

### 2. Via Context Parameter (Explicit)

Every handler receives a `Context` object as parameter:

```typescript
app.get('/users/:id', (ctx) => {
  const id = ctx.route.params.id;
  const user = getUserById(parseInt(id));
  return user;
});

app.post('/users', (ctx) => {
  const userData = ctx.body;
  return createUser(userData);
});
```

**Why AsyncLocalStorage is recommended:**
- Cleaner code - no need to pass context through helper functions
- Works in deeply nested function calls
- Native Web API Request object accessible via `request()`
- Type-safe with generics

## Next Steps

Congratulations! You have successfully built your first Minima.js application.

Now that you have a basic understanding of Minima.js, you can explore the following topics to learn more:

*   **[Core Concepts](/core-concepts/architecture)**: Learn about the fundamental architecture of Minima.js.
*   **[Guides](/guides/routing)**: Dive deeper into specific features like routing, middleware, and error handling.
*   **[Packages](/packages/auth)**: Discover the additional packages that can help you with authentication, data validation, and more.