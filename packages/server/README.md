Introducing the groundbreaking HTTP framework for Node.js - an innovation tailored for the modern developer seeking efficiency, elegance, and speed. This framework is designed with a forward-looking mindset, embracing the latest advancements in JavaScript while prioritizing ease of use and performance.

### Highlights

- **Functional Approach**: Embracing the functional programming paradigm, this framework empowers developers to write clean, concise, and composable code, promoting modular design and scalability.

- **100% TypeScript**: Built entirely in TypeScript, ensures type safety throughout the development process, reducing errors and enhancing code quality.

- **Mandatory ESM Adoption**: mandates the adoption of ECMAScript Modules (ESM) over CommonJS, ensuring developers unlock the full potential of modern JavaScript features like root-level await, code splitting and more...

- **Instant Context Access**: seamless access to request data like headers or body with functions like `request()` and `body()` anywhere within the same request context. Say goodbye to tedious `req`/`res` drilling.

- **No Boilerplate Needed**: Bid farewell to boilerplate code. With its minimalist approach, eliminates unnecessary setup and configuration.

### Getting started

Your project directory structure should look like this:

```
.
├── src
│   ├── index.ts         // Entry point
│   └── user             // User module
│       └── index.ts     // User module entry point
└── package.json
```

Ensure that your `package.json` file has the `"type": "module"` field to enable ECMAScript modules (ESM) support:

```json
{
  "name": "hello-nodejs",
  "type": "module"
}
```

Creating Your Application

```typescript title="src/index.ts"
import { createApp, params } from "@minimajs/server";

const app = createApp();

app.get("/:name", () => `Hello ${params.get("name")}!`);

await app.listen({ port: 1234 });
```

This code creates a MinimaJS application with a single route handler for the root URL `("/")` and a parameter `name`.

That's all!

---

Compiling and running your TypeScript project:

**Using tsc Compiler**

While you can compile your TypeScript code using the TypeScript Compiler (`tsc`) and then run the compiled JavaScript files, it might involve multiple steps. Here's how you can do it:

```bash
tsc src/*.ts --module NodeNext --moduleResolution NodeNext --outDir dist
node dist/index.js
```

_Server listening at http://0.0.0.0:1234_

```bash
curl http://0.0.0.0:1234/John
> Hello John!
```

**Using ebx Bundler**

On the other hand, you can utilize the `ebx` bundler, known for its lightning-fast performance and seamless bundling experience tailored specifically for Node.js projects.
Read more https://npmjs.com/package/ebx

installing ebx

```bash
yarn add -D ebx
```

Add following inside your `package.json` file

```json title="package.json"
{
  "scripts": {
    "dev": "ebx src/index.ts -wsr",
    "build": "ebx src/index.ts",
    "start": "node dist/index.js"
  }
}
```

With `ebx`, you can directly bundle and execute your TypeScript code in a single step, significantly reducing build times and simplifying your workflow.

To start your project in development mode.

```bash
yarn dev
```

To build your project for production deployment, run:

```bash
yarn build
```

Once your project is built, you can start the server using:

```bash
yarn start
```

This command runs the compiled JavaScript files in the `dist` directory.

See the full documentation https://minima-js.github.io/
