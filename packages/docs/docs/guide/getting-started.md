---
title: Getting started
sidebar_position: 2
tags:
  - installation
  - app
---

### Installation

```bash npm2yarn
npm i @minimajs/server
```

### Directory Structure

Your project directory structure should look like this:

```
.
├── src
│   ├── index.ts         // Entry point
│   └── user             // User module
│       └── index.ts     // User module entry point
└── package.json
```

### Setting Up Your Project

Ensure that your `package.json` file has the `"type": "module"` field to enable ECMAScript modules (ESM) support:

```json
{
  "name": "hello-nodejs",
  "type": "module"
}
```

#### Creating Your Application

```typescript title="src/index.ts"
import { createApp, getParam } from "@minimajs/server";

const app = createApp();

app.get("/:name", () => `Hello ${getParam("name")}!`);

await app.listen({ port: 1234 });
```

This code creates a MinimaJS application with a single route handler for the root URL `("/")` and a parameter `name`.

That's all!

Now, You have following options for compiling and running your TypeScript project:

### Using tsc Compiler

While you can compile your TypeScript code using the TypeScript Compiler (`tsc`) and then run the compiled JavaScript files, it might involve multiple steps. Here's how you can do it:

```bash
tsc src/*.ts --module NodeNext --moduleResolution NodeNext --outDir dist
node dist/index.js
```

```bash
└── /:name (GET, HEAD)

INFO (84531): Server listening at http://0.0.0.0:1234
```

```bash
curl http://0.0.0.0:1234/John
> Hello John!
```

### Using ebx Bundler

On the other hand, you can utilize the `ebx` bundler, known for its lightning-fast performance and seamless bundling experience tailored specifically for Node.js projects.
Read more https://npmjs.com/package/ebx

Here's how you can leverage it:

```bash npm2yarn
npm i --save-dev ebx
```

Add following inside your `package.json` file

```json title="package.json"
{
  "scripts": {
    // highlight-start
    "dev": "ebx src/index.ts -wsr",
    "build": "ebx src/index.ts",
    "start": "node dist/index.js"
    // highlight-end
  }
}
```

With `ebx`, you can directly bundle and execute your TypeScript code in a single step, significantly reducing build times and simplifying your workflow.

### Development Workflow

To start your project in development mode.

```bash
yarn dev
```

This command compiles your TypeScript code and starts the server with automatic reloading enabled.

### Production Build

To build your project for production deployment, run:

```bash
yarn build
```

This command compiles your TypeScript code into JavaScript files in the `dist` directory.

### Starting the Server

Once your project is built, you can start the server using:

```bash
yarn start
```

This command runs the compiled JavaScript files in the `dist` directory.
