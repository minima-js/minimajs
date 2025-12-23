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

Before you start, make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v18 or higher)
- A text editor (we recommend [VS Code](https://code.visualstudio.com/))
- A command-line interface (CLI) like Terminal or Command Prompt

## 1. Project Setup

First, let's create a new directory for our project and initialize a new Node.js project.

```bash
mkdir minimajs-todo-app
cd minimajs-todo-app
npm init -y
```

Next, we need to tell Node.js that we are using ECMAScript Modules (ESM). Open your `package.json` file and add the following line:

```json
{
  "name": "minimajs-todo-app",
  "version": "1.0.0",
  "description": "",
  "type": "module",
  "scripts": {
    "start": "tsx src/index.ts"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

## 2. Installation

Now, let's install `@minimajs/server`, the core package for building Minima.js applications.

```bash
npm install @minimajs/server
```

Optionally to run typescript

```base
npm i -D tsx
```

## 3. Creating the Server

Now, let's create a basic server. Open `src/index.ts` and add the following code:

```typescript title="src/index.ts"
import { createApp } from "@minimajs/server";

const app = createApp();

app.get("/", () => "Hello, World!");

await app.listen({ port: 3000 });

console.log("Server listening on http://localhost:3000");
```

This code creates a new Minima.js application, defines a single route for the root URL (`/`), and starts the server on port 3000.

## 4. Building the Todo App

Now, let's build the Todo application. We will create a simple in-memory "database" to store our todos and define routes for creating, reading, updating, and deleting todos.

Replace the content of `src/index.ts` with the following code:

```typescript title="src/index.ts"
import { createApp, body, params } from "@minimajs/server";

const app = createApp();

// In-memory "database" for todos
let todos = [
  { id: 1, text: "Learn Minima.js", completed: false },
  { id: 2, text: "Build a Todo app", completed: false },
];

// GET /todos - Get all todos
app.get("/todos", () => todos);

// GET /todos/:id - Get a single todo
app.get("/todos/:id", () => {
  const id = params.get("id", Number);
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    abort({ message: "Todo not found" }, 404);
  }
  return todo;
});

// POST /todos - Create a new todo
app.post("/todos", () => {
  const { text } = body<{ text: string }>();
  const newTodo = {
    id: todos.length + 1,
    text,
    completed: false,
  };
  todos.push(newTodo);
  return newTodo;
});

// PUT /todos/:id - Update a todo
app.put("/todos/:id", () => {
  const id = params.get("id", Number);
  const { text, completed } = body<{ text?: string; completed?: boolean }>();
  const todo = todos.find((t) => t.id === id);

  if (!todo) {
    return abort({ message: "Todo not found" }, 404);
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
app.delete("/todos/:id", () => {
  const id = params.get("id", Number);
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return abort({ message: "Todo not found" }, 404);
  }

  todos.splice(index, 1);
  return { message: "Todo deleted" };
});

await app.listen({ port: 3000 });

console.log("Server listening on http://localhost:3000");
```

## 5. Running the Application

Now you can run the application in development mode:

```bash
npm run start
```

You should see the message `Server listening on http://localhost:3000` in your console.

You can now use a tool like `curl` or Postman to interact with your Todo API:

- **`GET http://localhost:3000/todos`**: Get all todos.
- **`POST http://localhost:3000/todos`** with body `{"text": "My new todo"}`: Create a new todo.
- **`PUT http://localhost:3000/todos/1`** with body `{"completed": true}`: Update a todo.
- **`DELETE http://localhost:3000/todos/1`**: Delete a todo.

## Next Steps

Congratulations! You have successfully built your first Minima.js application.

Now that you have a basic understanding of Minima.js, you can explore the following topics to learn more:

- **[Core Concepts](/core-concepts/architecture)**: Learn about the fundamental architecture of Minima.js.
- **[Guides](/guides/routing)**: Dive deeper into specific features like routing, middleware, and error handling.
- **[Packages](/packages/auth)**: Discover the additional packages that can help you with authentication, data validation, and more.
