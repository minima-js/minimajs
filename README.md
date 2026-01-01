# MinimaJS

**The high-performance Node.js framework that's faster than Express, simpler than NestJS**

Minima.js is a cutting-edge TypeScript-first web framework built on Fastify, designed for modern developers who demand speed, simplicity, and exceptional developer experience.

## 🚀 Why MinimaJS?

### **Performance First**

- Built on **Fastify** - 2-3x faster than Express
- Optimized bundle size and runtime efficiency
- Stream-based file handling for large payloads

### **Developer Experience**

- **Zero Boilerplate** - Start building immediately
- **Context-Aware APIs** - No more prop drilling with `request()`, `body()`, `params()`
- **100% TypeScript** - End-to-end type safety
- **Modern Standards** - ESM-first, latest JavaScript features

### **Rich Ecosystem**

- 🔐 **Authentication** - Session & token-based auth
- 📁 **File Uploads** - Advanced multipart handling with validation
- ☁️ **Cloud Storage** - Azure Blob, local disk drivers
- ✅ **Validation** - zod-based schema validation
- 🍪 **Cookies** - Type-safe cookie management
- 🎨 **Templating** - Edge.js template engine
- 🔧 **Utilities** - Common helpers and tools

## 📦 Complete Package List

| Package                                           | Description                                 | Status         |
| ------------------------------------------------- | ------------------------------------------- | -------------- |
| **[@minimajs/server](./packages/server)**         | Core HTTP framework with context-aware APIs | ✅ Stable      |
| **[@minimajs/auth](./packages/auth)**             | Authentication system                       | ✅ Stable      |
| **[@minimajs/multipart](./packages/multipart)**   | File upload & multipart handling            | ✅ Stable      |
| **[@minimajs/schema](./packages/schema)**         | Yup-based validation                        | ✅ Stable      |
| **[@minimajs/cookie](./packages/cookie)**         | Type-safe cookie management                 | ✅ Stable      |
| **[@minimajs/edge](./packages/edge)**             | Edge.js template engine                     | ✅ Stable      |
| **[@minimajs/utility](./packages/utility)**       | Common utilities                            | ✅ Stable      |
| **[@minimajs/azure-blob](./packages/azure-blob)** | Azure Blob Storage driver                   | ✅ Stable      |
| **[@minimajs/disk](./packages/disk)**             | Local file system driver                    | ✅ Stable      |
| **[@minimajs/kafka](./packages/kafka)**           | Apache Kafka integration                    | 🚧 Coming Soon |
| **[@minimajs/isc](./packages/isc)**               | Inter-service communication                 | 🚧 Coming Soon |

## ⚡ Quick Comparison

### Express.js (Traditional)

```javascript
const express = require("express");
const multer = require("multer");
const app = express();

app.use(express.json());
app.use(multer().single("file"));

app.post("/users/:id", (req, res) => {
  const userId = req.params.id; // Manual extraction
  const userData = req.body; // No type safety
  const file = req.file; // Separate middleware
  // ... handle request
});
```

### MinimaJS (Modern)

```typescript
import { createApp, params } from "@minimajs/server";
import { multipart } from "@minimajs/multipart";

const app = createApp();

app.post("/users/:id", () => {
  const userId = params.get("id"); // Context-aware, type-safe
  const file = multipart.file("file"); // Built-in multipart
  // Zero boilerplate, maximum productivity
});
```

## 🎯 Key Features

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

This code creates a MinimaJS application with a single route handler for the root URL `("/")` that returns `Welcome Home <name>` as the response.

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
curl http://0.0.0.0:1234?name=John
> Welcome Home John
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
