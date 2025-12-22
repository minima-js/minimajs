# Architecture

Minima.js is designed with a modular and scalable architecture that allows developers to build modern web applications with ease. At its core, Minima.js is built on top of [Fastify](https://www.fastify.io/), a high-performance Node.js web framework. This foundation provides Minima.js with a powerful and efficient request lifecycle management system.

## Core Components

A Minima.js application is composed of several key components that work together to handle incoming requests and send responses.

```
Incoming Request
      │
      ▼
┌─────────────┐
│   Fastify   │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Middleware  │
└─────────────┘
      │
      ▼
┌─────────────┐
│   Hooks     │
└─────────────┘
      │
      ▼
┌─────────────┐
│   Context   │
└─────────────┘
      │
      ▼
┌─────────────┐
│ Route Handler│
└─────────────┘
      │
      ▼
Outgoing Response
```

### 1. Fastify Core

The foundation of Minima.js is Fastify. Fastify is responsible for handling the low-level HTTP server, routing, and request/response objects. Minima.js builds upon this foundation by adding a layer of abstraction and a set of powerful features.

### 2. Middleware

Middleware functions are executed before the route handler and can be used to perform tasks such as authentication, logging, and request parsing. Minima.js supports Fastify's middleware and also provides its own middleware system.

### 3. Hooks

Hooks are functions that can be executed at specific points in the request lifecycle. Minima.js provides a set of hooks that allow you to tap into the request/response lifecycle and add custom logic.

### 4. Context

The context is a key feature of Minima.js. It's an object that is created for each request and contains all the information about the request, such as the request headers, body, and parameters. The context can also be used to share data between middleware, hooks, and the route handler.

### 5. Route Handler

The route handler is the function that is responsible for processing the request and generating a response. The route handler has access to the context and can use it to get information about the request and send a response.

## Modular Structure

Minima.js encourages a modular approach to building applications. You can structure your application as a collection of modules, where each module is responsible for a specific feature or set of related features. This makes your application easier to maintain and scale.

A typical Minima.js application has the following directory structure:

```
.
├── src
│   ├── index.ts         // Entry point
│   └── user             // User module
│       └── index.ts     // User module entry point
└── package.json
```

In this structure, the `user` directory is a module that contains all the code related to the user feature. The `index.ts` file in the `user` directory is the entry point for the module and is responsible for defining the routes and other components of the module.